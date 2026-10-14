import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import {
  availableQty, getVariantAvailability, listProductVariantAvailability,
  holdInventory, commitReservations, releaseReservations,
} from "../apps/ecommerce-cms-agentsam/backend/store/inventory.js";

function fixture() {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE product_variants (id INTEGER PRIMARY KEY, product_id INTEGER, sku TEXT,
      size TEXT, color TEXT, price_cents INTEGER, inventory_qty INTEGER);
    CREATE TABLE completeful_product_links (id INTEGER PRIMARY KEY, product_id INTEGER,
      sync_status TEXT);
    CREATE TABLE completeful_variant_links (id INTEGER PRIMARY KEY, variant_id INTEGER,
      product_link_id INTEGER, completeful_catalog_variant_id TEXT);
    CREATE TABLE inventory_reservations (id INTEGER PRIMARY KEY, order_id INTEGER,
      variant_id INTEGER, qty INTEGER, status TEXT, expires_at TEXT);
    INSERT INTO product_variants VALUES
      (1,10,'STOCK-S','S','Black',2000,5),
      (2,20,'POD-M','M','White',2500,0),
      (3,30,'POD-PENDING','L','Gray',2500,0),
      (4,10,'STOCK-EMPTY','M','Black',2000,0);
    INSERT INTO completeful_product_links VALUES (100,20,'linked'),(101,30,'pending');
    INSERT INTO completeful_variant_links VALUES
      (200,2,100,'catalog-variant-2'),(201,3,101,'catalog-variant-3');
  `);
  const statement = (sql, args = []) => ({
    async first() { return db.prepare(sql).get(...args) ?? null; },
    async all() { return { results: db.prepare(sql).all(...args) }; },
    async run() {
      const result = db.prepare(sql).run(...args);
      return { meta: { changes: result.changes } };
    },
    bind(...values) { return statement(sql, values); },
  });
  return {
    db,
    env: { DB: {
      prepare(sql) { return statement(sql); },
      async batch(statements) {
        const result = [];
        for (const entry of statements) result.push(await entry.run());
        return result;
      },
    } },
  };
}

test("supplier-linked zero-stock variants return an explicit orderable contract", async () => {
  const { env } = fixture();
  assert.deepEqual(await getVariantAvailability(env, 2), {
    fulfillment: "supplier", available: true, available_qty: null, supplier_status: "ready",
  });
  assert.equal(await availableQty(env, 2), Number.POSITIVE_INFINITY);
  const detail = await listProductVariantAvailability(env, 20);
  assert.equal(detail.length, 1);
  assert.equal(detail[0].inventory_qty, 0);
  assert.equal(detail[0].available, true);
  assert.equal(detail[0].fulfillment, "supplier");
});

test("incomplete supplier mappings and zero local stock fail closed", async () => {
  const { env } = fixture();
  assert.deepEqual(await getVariantAvailability(env, 3), {
    fulfillment: "supplier", available: false, available_qty: null, supplier_status: "not_ready",
  });
  assert.equal(await availableQty(env, 3), 0);
  assert.equal((await getVariantAvailability(env, 4)).available, false);
  await assert.rejects(
    () => holdInventory(env, 2, [{ variant_id: 3, qty: 1 }]),
    /Insufficient inventory/,
  );
});

test("stock holds reduce availability; supplier lines do not consume local stock", async () => {
  const { env, db } = fixture();
  await holdInventory(env, 77, [{ variant_id: 1, qty: 3 }, { variant_id: 2, qty: 6 }]);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM inventory_reservations").get().n, 1);
  assert.equal((await getVariantAvailability(env, 1)).available_qty, 2);
  assert.equal((await getVariantAvailability(env, 2)).available, true);
  assert.deepEqual(await commitReservations(env, 77), { ok: true, shortfalls: [] });
  assert.equal(db.prepare("SELECT inventory_qty FROM product_variants WHERE id=1").get().inventory_qty, 2);
  assert.equal(db.prepare("SELECT inventory_qty FROM product_variants WHERE id=2").get().inventory_qty, 0);
  assert.equal(db.prepare("SELECT status FROM inventory_reservations WHERE order_id=77").get().status, "committed");
  await holdInventory(env, 78, [{ variant_id: 2, qty: 8 }]);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM inventory_reservations").get().n, 1);
  assert.equal(await releaseReservations(env, 78), 0);
});

test("duplicate cart lines cannot reserve more units than exist", async () => {
  const { env, db } = fixture();
  await assert.rejects(
    () => holdInventory(env, 88, [{ variant_id: 1, qty: 3 }, { variant_id: 1, qty: 3 }]),
    /Insufficient inventory/,
  );
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM inventory_reservations").get().n, 0);
});
