import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { getStoreProduct, createStoreCheckoutSession } from "../apps/ecommerce-cms-agentsam/backend/store/api.js";

function fixture() {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE products (id INTEGER PRIMARY KEY, slug TEXT, title TEXT, description TEXT,
      seo_title TEXT, seo_description TEXT, collection TEXT, price_cents INTEGER,
      image_url TEXT, status TEXT, updated_at TEXT);
    CREATE TABLE product_variants (id INTEGER PRIMARY KEY, product_id INTEGER, sku TEXT,
      size TEXT, color TEXT, price_cents INTEGER, inventory_qty INTEGER);
    CREATE TABLE completeful_product_links (id INTEGER PRIMARY KEY, product_id INTEGER,
      sync_status TEXT);
    CREATE TABLE completeful_variant_links (id INTEGER PRIMARY KEY, variant_id INTEGER,
      product_link_id INTEGER, completeful_catalog_variant_id TEXT);
    CREATE TABLE inventory_reservations (id INTEGER PRIMARY KEY, order_id INTEGER,
      variant_id INTEGER, qty INTEGER, status TEXT, expires_at TEXT);
    CREATE TABLE product_images (product_id INTEGER, media_asset_id INTEGER,
      is_primary INTEGER, position INTEGER);
    CREATE TABLE media_assets (id INTEGER PRIMARY KEY, url TEXT, filename TEXT, alt_text TEXT);
    CREATE TABLE orders (id INTEGER PRIMARY KEY AUTOINCREMENT, customer_email TEXT, status TEXT,
      total_cents INTEGER, subtotal_cents INTEGER, discount_cents INTEGER,
      discount_id INTEGER, discount_code TEXT, created_at TEXT, stripe_checkout_session_id TEXT);
    CREATE TABLE order_items (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER,
      variant_id INTEGER, title TEXT, qty INTEGER, price_cents INTEGER);
    INSERT INTO products VALUES
      (20,'mapped-hoodie','Mapped Hoodie',NULL,NULL,NULL,'apparel',2500,NULL,'active',NULL),
      (30,'pending-hoodie','Pending Hoodie',NULL,NULL,NULL,'apparel',2500,NULL,'active',NULL);
    INSERT INTO product_variants VALUES
      (2,20,'POD-M','M','White',2500,0),
      (3,30,'POD-PENDING','L','Gray',2500,0);
    INSERT INTO completeful_product_links VALUES (100,20,'linked'),(101,30,'pending');
    INSERT INTO completeful_variant_links VALUES
      (200,2,100,'provider-variant-2'),(201,3,101,'provider-variant-3');
  `);
  const statement = (sql, args = []) => ({
    bind(...values) { return statement(sql, values); },
    async first() { return db.prepare(sql).get(...args) ?? null; },
    async all() { return { results: db.prepare(sql).all(...args) }; },
    async run() {
      const result = db.prepare(sql).run(...args);
      return { meta: { changes: result.changes, last_row_id: Number(result.lastInsertRowid) } };
    },
  });
  const env = { DB: {
    prepare(sql) { return statement(sql); },
    async batch(statements) {
      const out = [];
      for (const stmt of statements) out.push(await stmt.run());
      return out;
    },
  }, STRIPE_SECRET_KEY: "test-key" };
  return { db, env };
}

test("PDP and Stripe checkout accept mapped supplier variants without decrementing local stock", async () => {
  const { db, env } = fixture();
  const product = await (await getStoreProduct(env, "mapped-hoodie")).json();
  assert.equal(product.variants[0].fulfillment, "supplier");
  assert.equal(product.variants[0].available, true);
  assert.equal(product.variants[0].inventory_qty, 0);

  const oldFetch = globalThis.fetch;
  let stripeCalls = 0;
  globalThis.fetch = async (url, options) => {
    stripeCalls++;
    assert.equal(url, "https://api.stripe.com/v1/checkout/sessions");
    const body = new URLSearchParams(options.body);
    assert.equal(body.get("line_items[0][quantity]"), "2");
    assert.equal(body.get("line_items[0][price_data][unit_amount]"), "2500");
    return Response.json({ id: "cs_fixture_123", url: "https://checkout.stripe.test/fixture" });
  };
  try {
    const response = await createStoreCheckoutSession(new Request(
      "https://merchant.example/api/store/checkout/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "buyer@example.com", items: [{ variant_id: 2, qty: 2 }] }),
      },
    ), env);
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.session_id, "cs_fixture_123");
    assert.equal(stripeCalls, 1);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM inventory_reservations").get().n, 0);
    assert.equal(db.prepare("SELECT inventory_qty FROM product_variants WHERE id=2").get().inventory_qty, 0);
    assert.equal(db.prepare("SELECT status FROM orders WHERE id=?").get(data.order_id).status, "awaiting_payment");
  } finally {
    globalThis.fetch = oldFetch;
  }
});

test("unready provider mapping is rejected before order creation or Stripe call", async () => {
  const { db, env } = fixture();
  const response = await createStoreCheckoutSession(new Request(
    "https://merchant.example/api/store/checkout/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "buyer@example.com", items: [{ variant_id: 3, qty: 1 }] }),
    },
  ), env);
  assert.equal(response.status, 400);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM orders").get().n, 0);
});
