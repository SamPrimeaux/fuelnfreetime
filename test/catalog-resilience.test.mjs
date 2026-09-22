import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { syncCompletefulCatalog } from "../src/completeful/catalog.js";
import { catalogImageSource } from "../src/completeful/images.js";

function database() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = OFF");
  db.exec(readFileSync(new URL("../db/migrate-completeful.sql", import.meta.url), "utf8"));
  const adapter = {
    failChild: false,
    prepare(sql) {
      let values = [];
      const stmt = {
        bind(...args) { values = args; return stmt; },
        run() {
          for (const v of values) if (typeof v === "string" && Buffer.byteLength(v) > 2000000) throw Error("SQLITE_TOOBIG");
          if (adapter.failChild && sql.includes("INSERT INTO completeful_catalog_mockups")) throw Error("Injected child failure");
          return { meta: { changes: Number(db.prepare(sql).run(...values).changes) } };
        },
        first() { return db.prepare(sql).get(...values); },
        all() { return { results: db.prepare(sql).all(...values) }; },
      };
      return stmt;
    },
    async batch(statements) {
      db.exec("BEGIN");
      try { const results = statements.map(s => s.run()); db.exec("COMMIT"); return results; }
      catch (e) { db.exec("ROLLBACK"); throw e; }
    },
  };
  return { db, adapter };
}
test("oversized provider source lives in R2; child failures retain the last complete product and cursor", async () => {
  const { db, adapter } = database(), objects = new Map();
  const env = { DB: adapter, CAPP_KEY: "test-fixture", WEBSITE_ASSETS: { async put(key, body) { objects.set(key, body); } } };
  let product = { id: "p1", name: "Original", mockups: [{ id: "m1", geometry: "a".repeat(2100000) }] };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ items: [product], pagination: { has_more: false, next_cursor: null } });
  try {
    const first = await syncCompletefulCatalog(env);
    assert.equal(first.ok, true);
    assert.equal(objects.size, 1);
    assert.ok(db.prepare("SELECT raw_json FROM completeful_catalog_products").get().raw_json.length < 500);
    assert.equal(db.prepare("SELECT COUNT(*) n FROM completeful_catalog_mockups").get().n, 1);
    adapter.failChild = true; product = { ...product, name: "Broken replacement" };
    const failed = await syncCompletefulCatalog(env);
    assert.equal(failed.ok, false);
    assert.equal(db.prepare("SELECT name FROM completeful_catalog_products").get().name, "Original");
    assert.equal(db.prepare("SELECT status FROM completeful_catalog_sync_state").get().status, "error");
    adapter.failChild = false;
    const retry = await syncCompletefulCatalog(env, { reset: false });
    assert.equal(retry.ok, true);
    assert.equal(db.prepare("SELECT name FROM completeful_catalog_products").get().name, "Broken replacement");
    db.prepare("UPDATE completeful_catalog_sync_state SET status='running', updated_at=datetime('now')").run();
    assert.equal((await syncCompletefulCatalog(env)).status, "busy");
  } finally { globalThis.fetch = originalFetch; db.close(); }
});
test("catalog image allowlist rejects private and arbitrary origins", () => {
  const base = "https://jvkydnvdajcfnqysmuwt.supabase.co";
  assert.ok(catalogImageSource(base + "/storage/v1/object/public/product-images/a.png"));
  for (const source of ["http://127.0.0.1/a", base + "/storage/v1/object/private/a.png", base + "/storage/v1/object/public/product-images/a.png?token=secret", "https://evil.example/a.png"])
    assert.equal(catalogImageSource(source), null);
});
