import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { getStoreCollection, listStoreCollections } from "../apps/ecommerce-cms-agentsam/backend/store/collections.js";

function fixture({ migrated = false } = {}) {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE products (id INTEGER PRIMARY KEY, slug TEXT, title TEXT, description TEXT, collection TEXT, price_cents INTEGER, image_url TEXT, status TEXT, updated_at TEXT);
    CREATE TABLE product_variants (id INTEGER PRIMARY KEY, product_id INTEGER, size TEXT, inventory_qty INTEGER);
    CREATE TABLE media_assets (id INTEGER PRIMARY KEY, url TEXT);
    CREATE TABLE product_images (product_id INTEGER, media_asset_id INTEGER, position INTEGER, is_primary INTEGER);
    INSERT INTO products VALUES (1, 'garage-tee', 'Garage Tee', 'A durable tee.', 'High Octane', 3400, '/tee.jpg', 'active', datetime('now'));
    INSERT INTO product_variants VALUES (1, 1, 'M', 4);
  `);
  if (migrated) db.exec(readFileSync(new URL("../db/migrate-storefront-collections-20260925.sql", import.meta.url), "utf8"));
  const adapter = {
    prepare(sql) {
      let values = [];
      const statement = {
        bind(...args) { values = args; return statement; },
        first() { return db.prepare(sql).get(...values); },
        all() { return { results: db.prepare(sql).all(...values) }; },
      };
      return statement;
    },
  };
  return { db, env: { DB: adapter } };
}

test("collection index remains usable before migration", async () => {
  const { db, env } = fixture();
  try {
    const response = await listStoreCollections(env);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.collections.length, 3);
    assert.equal(body.collections.find((item) => item.slug === "high-octane-performance-gear").product_count, 1);
  } finally { db.close(); }
});

test("collection detail uses canonical table membership after migration", async () => {
  const { db, env } = fixture({ migrated: true });
  try {
    const response = await getStoreCollection(env, "high-octane-performance-gear");
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.collection.title, "High Octane");
    assert.deepEqual(body.products.map((product) => product.slug), ["garage-tee"]);
  } finally { db.close(); }
});

test("unknown collection returns a real 404", async () => {
  const { db, env } = fixture();
  try {
    const response = await getStoreCollection(env, "not-real");
    assert.equal(response.status, 404);
  } finally { db.close(); }
});
