import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_MIRRORED_IMAGES_PER_PRODUCT,
  statementsForCatalogProduct,
} from "../apps/ecommerce-cms-agentsam/backend/completeful/catalog.js";

test("huge Completeful catalog images are archived intact in R2 but bounded in transactional D1", async () => {
  const originalImages = Array.from({ length: 4356 }, (_, index) => ({
    id: "image-" + index,
    url: "https://provider.example/images/" + index + ".jpg",
    sort_order: index,
    is_primary: index === 4355,
    type: "mockup",
  }));
  const product = {
    id: "sample-large-product",
    name: "Large supplier product",
    available: true,
    marketplace_eligible: true,
    pricing: {},
    images: originalImages,
    variants: [{ id: "s", sku: "sku-s", variant_attributes: { Size: "S" } }],
    mockups: [{ id: "mockup1", print_location_id: "front", preview_url: "https://provider.example/front.png" }],
    print_locations: [{ id: "front", name: "Front", enabled: true }],
  };
  const r2 = [];
  const queries = [];
  const env = {
    WEBSITE_ASSETS: { async put(key, body) { r2.push({ key, body }); } },
    DB: { prepare(sql) { return { bind(...params) {
      queries.push({ sql, params });
      return { sql, params };
    }}; }},
  };
  const result = await statementsForCatalogProduct(env, product, "token", "request");
  assert.equal(r2.length, 1);
  assert.equal(JSON.parse(r2[0].body).images.length, 4356, "Original supplier payload must not be truncated");
  assert.equal(result.archivedImages, 4356);
  assert.equal(result.mirroredImages, MAX_MIRRORED_IMAGES_PER_PRODUCT);
  const imageInserts = queries.filter(x => /INSERT INTO completeful_catalog_images/.test(x.sql));
  assert.equal(imageInserts.length, 96);
  assert.equal(imageInserts[0].params[1], "image-4355", "Primary supplier photo wins the mirror priority");
  assert.equal(queries.filter(x => /INSERT INTO completeful_catalog_variants/.test(x.sql)).length, 1);
  assert.equal(queries.filter(x => /INSERT INTO completeful_catalog_mockups/.test(x.sql)).length, 1);
  assert.ok(result.statements.length < 120, "D1 product transaction must remain bounded");
});
