import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { handlePublicSearchDiscovery } from "../apps/ecommerce-cms-agentsam/backend/store/search-discovery.js";
import { getStoreSearchDiscovery } from "../apps/ecommerce-cms-agentsam/backend/admin/search-discovery.js";
import { INDEXABLE_STORE_ROUTES } from "../apps/ecommerce-cms-agentsam/backend/lib/route-manifest.js";

function fixture(websiteUrl = "https://store.example.com") {
  const db = new DatabaseSync(":memory:");
  db.exec(`
    CREATE TABLE company (
      id TEXT PRIMARY KEY, slug TEXT, name TEXT, legal_name TEXT, logo_url TEXT,
      favicon_url TEXT, primary_color TEXT, auth_bg_color TEXT, support_email TEXT,
      website_url TEXT, tagline TEXT, meta_json TEXT, created_at INTEGER, updated_at INTEGER
    );
    CREATE TABLE products (id INTEGER PRIMARY KEY, slug TEXT, status TEXT, updated_at TEXT);
    INSERT INTO company VALUES ('co_test','test-store','Test Store',NULL,NULL,NULL,NULL,NULL,NULL,
      '${websiteUrl}',NULL,'{}',1,1);
    INSERT INTO products VALUES (1,'public-product','active','2026-10-07 12:00:00');
    INSERT INTO products VALUES (2,'draft-product','draft','2026-10-07 12:00:00');
  `);
  const env = {
    DB: {
      prepare(sql) {
        let values = [];
        const statement = {
          bind(...args) { values = args; return statement; },
          first() { return db.prepare(sql).get(...values); },
          all() { return { results: db.prepare(sql).all(...values) }; },
          run() { return db.prepare(sql).run(...values); },
        };
        return statement;
      },
    },
  };
  return { db, env };
}

test("robots.txt is generated from the verified store origin and blocks admin surfaces", async () => {
  const { db, env } = fixture();
  try {
    const response = await handlePublicSearchDiscovery(
      new Request("https://store.example.com/robots.txt"), env, new URL("https://store.example.com/robots.txt"),
    );
    const body = await response.text();
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /text\/plain/);
    assert.match(body, /^Disallow: \/admin$/m);
    assert.match(body, /^Disallow: \/api$/m);
    assert.match(body, /Sitemap: https:\/\/store\.example\.com\/sitemap\.xml/);
  } finally { db.close(); }
});

test("sitemap contains canonical public routes and active products, never drafts or cart", async () => {
  const { db, env } = fixture();
  try {
    const response = await handlePublicSearchDiscovery(
      new Request("https://store.example.com/sitemap.xml"), env, new URL("https://store.example.com/sitemap.xml"),
    );
    const body = await response.text();
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /application\/xml/);
    assert.match(body, /https:\/\/store\.example\.com\/products\/public-product/);
    assert.doesNotMatch(body, /draft-product/);
    assert.doesNotMatch(body, /\/cart(?:<|\/)/);
    for (const route of INDEXABLE_STORE_ROUTES) assert.ok(body.includes(`https://store.example.com${route.path}`));
    assert.match(body, /<lastmod>2026-10-07T12:00:00.000Z<\/lastmod>/);
  } finally { db.close(); }
});

test("admin discovery summary reports only real route and active-product counts", async () => {
  const { db, env } = fixture();
  try {
    const response = await getStoreSearchDiscovery(env);
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.public_discovery.indexable_routes, INDEXABLE_STORE_ROUTES.length);
    assert.equal(body.public_discovery.active_products, 1);
    assert.equal(body.public_discovery.sitemap_url_count, INDEXABLE_STORE_ROUTES.length + 1);
    assert.equal(body.crawler_capability, "site.scrape");
    assert.equal(body.crawler_binding_present, false);
  } finally { db.close(); }
});

test("invalid origins fail closed and unsupported discovery methods are rejected", async () => {
  const { db, env } = fixture("http://127.0.0.1/private");
  try {
    const response = await handlePublicSearchDiscovery(
      new Request("https://store.example.com/robots.txt"), env, new URL("https://store.example.com/robots.txt"),
    );
    assert.equal(response.status, 503);
    const method = await handlePublicSearchDiscovery(
      new Request("https://store.example.com/sitemap.xml", { method: "POST" }), env,
      new URL("https://store.example.com/sitemap.xml"),
    );
    assert.equal(method.status, 405);
    assert.equal(await response.text(), "Storefront HTTPS domain is not configured.\n");
  } finally { db.close(); }
});
