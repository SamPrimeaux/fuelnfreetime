import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import {
  listAdminCollections, createAdminCollection, getAdminCollection,
  updateAdminCollection, updateAdminCollectionProducts, addAdminCollectionProduct
} from "../apps/ecommerce-cms-agentsam/backend/admin/api.js";
import { getStoreCollection } from "../apps/ecommerce-cms-agentsam/backend/store/collections.js";
import { adminHtmlFile, ADMIN_HTML_TO_CLEAN } from "../apps/ecommerce-cms-agentsam/backend/lib/admin-routes.js";
import { adminRouteForPath } from "../apps/ecommerce-cms-agentsam/backend/lib/route-manifest.js";

function fixture() {
  const db = new DatabaseSync(":memory:");
  db.exec([
    "CREATE TABLE products (id INTEGER PRIMARY KEY, slug TEXT, title TEXT, description TEXT, collection TEXT, price_cents INTEGER, image_url TEXT, status TEXT, updated_at TEXT);",
    "CREATE TABLE product_variants (id INTEGER PRIMARY KEY, product_id INTEGER, size TEXT, inventory_qty INTEGER);",
    "CREATE TABLE media_assets (id INTEGER PRIMARY KEY, url TEXT);",
    "CREATE TABLE completeful_catalog_products (completeful_product_id TEXT PRIMARY KEY, catalog_product_id TEXT);",
    "INSERT INTO completeful_catalog_products(completeful_product_id,catalog_product_id) VALUES ('blank-tee','blank-tee'),('blank-hoodie','blank-hoodie');",
    "CREATE TABLE product_images (product_id INTEGER, media_asset_id INTEGER, position INTEGER, is_primary INTEGER);",
    "CREATE TABLE store_collections (id INTEGER PRIMARY KEY AUTOINCREMENT, slug TEXT NOT NULL UNIQUE, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', eyebrow TEXT NOT NULL DEFAULT '', image_url TEXT, accent_color TEXT NOT NULL DEFAULT '#ff4d00', hero_settings_json TEXT NOT NULL DEFAULT '{}', product_plan_json TEXT NOT NULL DEFAULT '[]', status TEXT NOT NULL DEFAULT 'draft', sort_order INTEGER NOT NULL DEFAULT 0, seo_title TEXT, seo_description TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')));",
    "CREATE TABLE store_collection_products (collection_id INTEGER NOT NULL, product_id INTEGER NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')), PRIMARY KEY(collection_id,product_id));",
    "INSERT INTO products(id,slug,title,description,collection,price_cents,image_url,status,updated_at) VALUES (1,'freedom-hauler','Freedom Hauler','Heavy cotton tee','',2700,'/shirt.jpg','active',datetime('now')),(2,'diesel-cap','Diesel Cap','Six panel cap','',3400,'/cap.jpg','draft',datetime('now'));"
  ].join("\n"));
  const wrap = (sql, values = []) => ({
    bind(...args) { return wrap(sql, args); },
    first() { return db.prepare(sql).get(...values) || null; },
    all() { return { results: db.prepare(sql).all(...values) }; },
    run() {
      const result = db.prepare(sql).run(...values);
      return { meta: { last_row_id: Number(result.lastInsertRowid) } };
    },
  });
  return {
    db,
    env: {
      DB: {
        prepare: (sql) => wrap(sql),
        async batch(statements) {
          db.exec("BEGIN");
          try {
            const result = statements.map((stmt) => stmt.run());
            db.exec("COMMIT");
            return result;
          } catch (error) { db.exec("ROLLBACK"); throw error; }
        },
      },
    },
  };
}
function request(body, method = "POST") {
  return new Request("https://fuelnfreetime.com/api/admin/collections", {
    method, headers: { "content-type": "application/json" }, body: JSON.stringify(body)
  });
}
test("Collections Studio uses the canonical React routes and keeps the old .html URL redirected", () => {
  for (const path of ["/admin/collections","/admin/collections/new","/admin/collections/42"]) {
    assert.equal(adminRouteForPath(path)?.handler, "admin-spa", path);
    assert.equal(adminHtmlFile(path), null);
  }
  assert.equal(ADMIN_HTML_TO_CLEAN["/admin/collections.html"], "/admin/collections");
  const shell = readFileSync(new URL("../apps/ecommerce-cms-agentsam/frontend/shell.js", import.meta.url), "utf8");
  const router = readFileSync(new URL("../apps/ecommerce-cms-agentsam/frontend/src/App.tsx", import.meta.url), "utf8");
  assert.match(shell, /href: "\/admin\/collections", label: "Collections"/);
  assert.match(router, /path="collections\/new" element={<CollectionEditor/);
  assert.match(router, /path="collections\/:id" element={<CollectionEditor/);
});
test("create, edit, assign and storefront reflect canonical collections", async () => {
  const { db, env } = fixture();
  try {
    const created = await createAdminCollection(request({
      title: "Diesel Driven", slug: "diesel-driven", description: "Long-haul gear",
      eyebrow: "Built for miles", accent_color: "#f06920", sort_order: 7,
      seo_title: "Diesel Driven Collection", seo_description: "Gear for the road", status: "draft",
      hero_settings_json: JSON.stringify({ layout: "split", headline: "Diesel Driven",
        primaryCta: { label: "Shop now", href: "#collection-products" } }),
      product_plan_json: JSON.stringify([{ catalog_product_id: "blank-tee" }])
    }), env);
    assert.equal(created.status, 201);
    const first = await created.json();
    assert.equal(first.collection.eyebrow, "Built for miles");
    assert.equal(first.collection.accent_color, "#f06920");
    assert.equal(JSON.parse(first.collection.hero_settings_json).headline, "Diesel Driven");
    assert.equal(JSON.parse(first.collection.product_plan_json)[0].catalog_product_id, "blank-tee");
    const id = first.collection.id;
    const saved = await updateAdminCollection(request({
      title: "Diesel Driven", slug: "diesel-driven", status: "active",
      description: "Updated gear", eyebrow: "Built for miles", accent_color: "#f06920",
      sort_order: 9, image_url: "/assets/diesel.jpg", seo_title: "Diesel Driven",
      seo_description: "Collection details",
      hero_settings_json: JSON.stringify({
        layout: "right", headline: "Freedom on the open road",
        backgroundMode: "gradient", backgroundColor: "#090b0c",
        primaryCta: { label: "Browse this drop", href: "#collection-products" }
      }),
      product_plan_json: JSON.stringify([
        { catalog_product_id: "blank-tee" }, { catalog_product_id: "blank-hoodie" }
      ])
    }, "PUT"), env, id);
    assert.equal(saved.status, 200);
    assert.equal((await updateAdminCollectionProducts(request({ product_ids: [1, 2] }, "PUT"), env, id)).status, 200);
    const detail = await (await getAdminCollection(null, env, id)).json();
    assert.deepEqual(detail.product_ids, [1, 2]);
    assert.equal(detail.collection.status, "active");
    assert.equal(detail.collection.image_url, "/assets/diesel.jpg");
    assert.equal(JSON.parse(detail.collection.hero_settings_json).layout, "right");
    assert.equal(JSON.parse(detail.collection.product_plan_json).length, 2);
    assert.equal((await (await listAdminCollections(null, env)).json()).collections[0].product_count, 2);
    const storefront = await (await getStoreCollection(env, "diesel-driven")).json();
    assert.deepEqual(storefront.products.map((p) => p.slug), ["freedom-hauler"]);
    assert.equal((await updateAdminCollectionProducts(request({ product_ids: [2] }, "PUT"), env, id)).status, 200);
    assert.deepEqual((await (await getAdminCollection(null, env, id)).json()).product_ids, [2]);
    assert.equal((await (await getStoreCollection(env, "diesel-driven")).json()).products.length, 0);
  } finally { db.close(); }
});
test("supplier blank plans validate real cached catalog identities and do not publish or duplicate", async () => {
  const { db, env } = fixture();
  try {
    const created = await createAdminCollection(request({
      title: "Staged", product_plan_json: JSON.stringify([{ catalog_product_id: "blank-tee" }]),
    }), env);
    assert.equal(created.status, 201);
    const id = (await created.json()).collection.id;
    const added = await addAdminCollectionProduct(request({ product_id: 1 }), env, id);
    assert.equal(added.status, 200);
    const twice = await addAdminCollectionProduct(request({ product_id: 1 }), env, id);
    assert.equal(twice.status, 200);
    const detail = (await (await getAdminCollection(null, env, id)).json());
    assert.deepEqual(detail.product_ids, [1]);
    assert.equal((await createAdminCollection(request({
      title: "Invalid Supplier", product_plan_json: JSON.stringify([{ catalog_product_id: "fake" }])
    }), env)).status, 400);
    assert.equal((await addAdminCollectionProduct(request({ product_id: 999 }), env, id)).status, 404);
  } finally { db.close(); }
});

test("invalid assignments and duplicate URL handles fail closed", async () => {
  const { db, env } = fixture();
  try {
    const make = (title) => createAdminCollection(request({ title, status: "draft" }), env);
    const first = (await (await make("First")).json()).collection;
    await make("Second");
    assert.equal((await updateAdminCollectionProducts(request({ product_ids: [999] }, "PUT"), env, first.id)).status, 409);
    assert.equal((await updateAdminCollectionProducts(request({ product_ids: [1, 1] }, "PUT"), env, first.id)).status, 400);
    assert.equal((await (await getAdminCollection(null, env, first.id)).json()).product_ids.length, 0);
    assert.equal((await make("First")).status, 409);
    assert.equal((await updateAdminCollection(request({
      title: "Second", slug: "second", status: "active", accent_color: "#ffffff"
    }, "PUT"), env, first.id)).status, 409);
  } finally { db.close(); }
});
