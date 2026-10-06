import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { decorateProductPage } from "../apps/ecommerce-cms-agentsam/backend/store/product-seo.js";

const read = (path) => readFileSync(path, "utf8");
const migration = read("db/migrate-product-seo-20261006.sql");
const admin = read("apps/ecommerce-cms-agentsam/backend/admin/api.js");
const editor = read("apps/ecommerce-cms-agentsam/frontend/static/product-edit.html");
const worker = read("apps/ecommerce-cms-agentsam/backend/index.js");

test("commerce SEO migration is additive and preserves existing records", () => {
  assert.match(migration, /ALTER TABLE products ADD COLUMN seo_title TEXT/);
  assert.match(migration, /ALTER TABLE products ADD COLUMN seo_description TEXT/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS product_slug_redirects/);
  assert.doesNotMatch(migration, /DROP TABLE|DELETE FROM products|CREATE TABLE products/);
});

test("Product Editor saves SEO and multi-collection membership together", () => {
  assert.match(editor, /id="seo-title-input"/);
  assert.match(editor, /id="seo-description-input"/);
  assert.match(editor, /seo_title: document\.getElementById\("seo-title-input"\)/);
  assert.match(editor, /seo_description: document\.getElementById\("seo-description-input"\)/);
  assert.match(editor, /collection_ids: \[\.\.\.selectedCollectionIds\]/);
  assert.match(editor, /renderCollections\(\)/);
  assert.match(editor, /Save did not verify against the stored product/);
  assert.match(admin, /const writes = \[update\]/);
  assert.match(admin, /writes\.push\(redirect\)/);
  assert.match(admin, /DELETE FROM store_collection_products WHERE product_id/);
  assert.match(admin, /await env\.DB\.batch\(writes\)/);
  assert.match(admin, /POST"\) return createAdminCollection/);
  assert.match(admin, /SELECT collection_id FROM store_collection_products/);
});

test("published old URLs redirect and HTML includes real product metadata", () => {
  assert.match(worker, /SELECT p\.slug FROM product_slug_redirects/);
  assert.match(worker, /Response\.redirect\(destination\.toString\(\), 301\)/);
  assert.match(worker, /decorateProductPage\(page, product, request\.url\)/);
  const previous = globalThis.HTMLRewriter;
  const inspected = {};
  globalThis.HTMLRewriter = class {
    handlers = {};
    on(selector, handler) { this.handlers[selector] = handler; return this; }
    transform(response) {
      this.handlers.title.element({ setInnerContent(value) { inspected.title = value; } });
      this.handlers['meta[name="description"]'].element({
        setAttribute(name, value) { inspected[name] = value; }
      });
      this.handlers.head.element({
        append(value) { inspected.head = value; }
      });
      return response;
    }
  };
  try {
    const page = {};
    const actual = decorateProductPage(page, {
      slug: "test-product", title: "Original", description: "Original summary",
      seo_title: 'Better "title"', seo_description: "Better summary",
      image_url: "/media/product.png"
    }, "https://example.test/products/test-product");
    assert.equal(actual, page);
    assert.equal(inspected.title, 'Better "title"');
    assert.equal(inspected.content, "Better summary");
    assert.match(inspected.head, /og:title.*Better &quot;title&quot;/);
    assert.match(inspected.head, /og:image.*https:\/\/example\.test\/media\/product\.png/);
    assert.match(inspected.head, /rel="canonical"/);
    decorateProductPage({}, {
      slug: "no-photo", title: "No photo yet", description: "", image_url: null
    }, "https://example.test/products/no-photo");
    assert.doesNotMatch(inspected.head, /og:image/);
  } finally {
    globalThis.HTMLRewriter = previous;
  }
});
