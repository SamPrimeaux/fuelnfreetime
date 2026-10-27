import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";

test("additive hero and supplier-plan columns preserve existing collection membership", () => {
  const db = new DatabaseSync(":memory:");
  try {
    db.exec([
      "CREATE TABLE store_collections (id INTEGER PRIMARY KEY, title TEXT, status TEXT DEFAULT 'active');",
      "CREATE TABLE store_collection_products (collection_id INTEGER, product_id INTEGER);",
      "INSERT INTO store_collections (id,title) VALUES (5,'Diesel Driven');",
      "INSERT INTO store_collection_products VALUES (5,23);"
    ].join("\n"));
    const migration = readFileSync(new URL("../db/migrate-collection-hero-generator-20261027.sql", import.meta.url), "utf8");
    db.exec(migration);
    const row = db.prepare("SELECT title,hero_settings_json,product_plan_json FROM store_collections WHERE id=5").get();
    assert.equal(row.title, "Diesel Driven");
    assert.deepEqual(JSON.parse(row.hero_settings_json), {});
    assert.deepEqual(JSON.parse(row.product_plan_json), []);
    assert.equal(db.prepare("SELECT product_id FROM store_collection_products WHERE collection_id=5").get().product_id, 23);
  } finally { db.close(); }
});
