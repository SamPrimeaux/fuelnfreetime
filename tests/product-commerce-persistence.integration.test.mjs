import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { createAdminCollection, getProduct, updateProduct } from "../apps/ecommerce-cms-agentsam/backend/admin/api.js";

function fixture() {
  const sql = new DatabaseSync(":memory:");
  const definitions = [
    "PRAGMA foreign_keys=ON",
    "CREATE TABLE products (id INTEGER PRIMARY KEY, slug TEXT UNIQUE, title TEXT, description TEXT, seo_title TEXT, seo_description TEXT, collection TEXT, price_cents INTEGER, image_url TEXT, status TEXT, updated_at TEXT)",
    "CREATE TABLE product_variants (id INTEGER PRIMARY KEY, product_id INTEGER REFERENCES products(id), sku TEXT UNIQUE, size TEXT, color TEXT, price_cents INTEGER, inventory_qty INTEGER, updated_at TEXT)",
    "CREATE TABLE product_studio_drafts (id TEXT PRIMARY KEY, product_id INTEGER, completeful_catalog_product_id TEXT, state TEXT, version INTEGER, original_media_asset_id INTEGER, prepared_media_asset_id INTEGER, preview_media_asset_id INTEGER, completeful_design_id TEXT, completeful_render_status TEXT)",
    "CREATE TABLE completeful_product_links (id INTEGER PRIMARY KEY, product_id INTEGER, completeful_store_product_id TEXT, sync_status TEXT)",
    "CREATE TABLE store_collections (id INTEGER PRIMARY KEY, slug TEXT UNIQUE, title TEXT, description TEXT DEFAULT '', image_url TEXT, seo_title TEXT, seo_description TEXT, status TEXT DEFAULT 'draft', sort_order INTEGER DEFAULT 0, updated_at TEXT)",
    "CREATE TABLE store_collection_products (collection_id INTEGER, product_id INTEGER, sort_order INTEGER, PRIMARY KEY (collection_id, product_id))",
    "CREATE TABLE product_slug_redirects (old_slug TEXT PRIMARY KEY, product_id INTEGER, created_at TEXT DEFAULT (datetime('now')))",
    "INSERT INTO products VALUES (42,'old-tee','Old title','Original description',NULL,NULL,'essentials',1200,'/media/approved-tee.jpg','draft',datetime('now'))",
    "INSERT INTO product_variants VALUES (5,42,'tee-m','M','Black',1000,7,datetime('now'))",
    "INSERT INTO product_studio_drafts VALUES ('draft-42',42,'catalog-123','draft',1,21,22,23,NULL,NULL)",
    "INSERT INTO store_collections(id,slug,title,status,sort_order) VALUES (1,'essentials','Essentials','active',1)",
    "INSERT INTO store_collections(id,slug,title,status,sort_order) VALUES (2,'masters','Masters','active',2)",
    "INSERT INTO store_collection_products VALUES (1,42,0)",
  ];
  for (const statement of definitions) sql.exec(statement + ";");
  function statement(query, params = []) {
    const row = sql.prepare(query);
    return {
      bind(...args) { return statement(query, args); },
      async first() { return row.get(...params) || null; },
      async all() { return { results: row.all(...params) }; },
      async run() {
        const result = row.run(...params);
        return { meta: { changes: result.changes, last_row_id: Number(result.lastInsertRowid) } };
      },
      executeSync() { return row.run(...params); },
    };
  }
  const env = { DB: {
    prepare(query) { return statement(query); },
    async batch(writes) {
      const results = [];
      sql.exec("BEGIN");
      try {
        for (const entry of writes) results.push(entry.executeSync());
        sql.exec("COMMIT");
        return results;
      } catch (err) {
        sql.exec("ROLLBACK");
        throw err;
      }
    },
  } };
  async function put(data) {
    const request = new Request("https://test.invalid/api/admin/products/42", {
      method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(data)
    });
    const response = await updateProduct(request, env, 42);
    return { status: response.status, body: await response.json() };
  }
  async function get() {
    const response = await getProduct(new Request("https://test.invalid"), env, 42);
    return response.json();
  }
  const base = {
    title: "New title", slug: "old-tee", description: "Commerce description",
    seo_title: "Search-friendly", seo_description: "Distinct meta summary",
    collection: "essentials", collection_ids: [1,2],
    price_cents: 3499, status: "draft",
  };
  return { sql, env, put, get, base };
}

test("Product Details persists commercial fields, collections and partial variant fields without destroying inventory", async () => {
  const { sql, put, get, base } = fixture();
  sql.prepare("UPDATE product_variants SET inventory_qty = 17 WHERE id=5").run();
  const response = await put({ ...base, variants: [{ id: 5, sku: "tee-m-v2", price_cents: 3299 }] });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  const d = await get();
  assert.equal(d.product.title, "New title");
  assert.equal(d.product.description, "Commerce description");
  assert.equal(d.product.seo_title, "Search-friendly");
  assert.equal(d.product.seo_description, "Distinct meta summary");
  assert.equal(d.product.price_cents, 3499);
  assert.equal(d.product.status, "draft");
  assert.equal(d.product.image_url, "/media/approved-tee.jpg");
  assert.deepEqual(d.collection_ids, [1,2]);
  assert.equal(d.variants[0].sku, "tee-m-v2");
  assert.equal(d.variants[0].price_cents, 3299);
  assert.equal(d.variants[0].inventory_qty, 17);
  assert.equal(d.design_draft.id, "draft-42");
  assert.equal(d.design_draft.product_id, d.product.id);
  assert.equal(d.fulfillment, null);
});

test("Product Editor inventory changes affect the same variant row read by Inventory", async () => {
  const { sql, put, base } = fixture();
  const r = await put({ ...base, variants: [{ id: 5, inventory_qty: 12 }] });
  assert.equal(r.status, 200);
  assert.equal(sql.prepare("SELECT inventory_qty FROM product_variants WHERE id=5").get().inventory_qty, 12);
});

test("Invalid variant edits abort product and merchandising changes", async () => {
  const { sql, put, base } = fixture();
  const failed = await put({ ...base, variants: [{ id: 5, inventory_qty: -2 }] });
  assert.equal(failed.status, 400);
  assert.equal(sql.prepare("SELECT title FROM products WHERE id=42").get().title, "Old title");
  assert.deepEqual(sql.prepare("SELECT collection_id FROM store_collection_products WHERE product_id=42").all().map(x=>x.collection_id), [1]);
});

test("A Studio draft cannot publish before fulfillment; published handles maintain redirects", async () => {
  const { sql, put, base } = fixture();
  const blocked = await put({ ...base, status: "active" });
  assert.equal(blocked.status, 409);
  assert.match(blocked.body.error, /Connect Completeful fulfillment first/);
  assert.equal(sql.prepare("SELECT status FROM products WHERE id=42").get().status, "draft");
  sql.prepare("INSERT INTO completeful_product_links(product_id,completeful_store_product_id,sync_status) VALUES(42,'provider-product','linked')").run();
  const good = await put({ ...base, status: "active" });
  assert.equal(good.status, 200);
  const changed = await put({ ...base, slug: "new-tee", status: "active" });
  assert.equal(changed.status, 200);
  assert.equal(sql.prepare("SELECT product_id FROM product_slug_redirects WHERE old_slug='old-tee'").get().product_id, 42);
});

test("Collection creation is independent of product publishing", async () => {
  const { sql, env } = fixture();
  const request = new Request("https://test.invalid/api/admin/collections", {
    method: "POST", headers: { "content-type":"application/json" },
    body: JSON.stringify({ title: "Trackside Weekends", status: "draft" })
  });
  const response = await createAdminCollection(request, env);
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(body.collection.slug, "trackside-weekends");
  assert.equal(body.collection.status, "draft");
  assert.equal(sql.prepare("SELECT status FROM products WHERE id=42").get().status, "draft");
});
