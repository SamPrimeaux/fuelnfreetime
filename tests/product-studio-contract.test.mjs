import assert from "node:assert/strict";
import test from "node:test";
import { getCompletefulCatalogProduct } from "../apps/ecommerce-cms-agentsam/backend/completeful/catalog.js";

function createDb({ product = null, imageTotal = 0, images = [] } = {}) {
  const calls = [];

  const DB = {
    prepare(sql) {
      const statement = {
        args: [],
        bind(...args) {
          statement.args = args;
          calls.push({ sql, args });
          return statement;
        },
        async first() {
          if (sql.includes("FROM completeful_catalog_products p")) return product;
          if (sql.includes("SELECT COUNT(*) AS n") && sql.includes("completeful_catalog_images")) {
            return { n: imageTotal };
          }
          throw new Error(`Unexpected first() query: ${sql}`);
        },
        async all() {
          if (sql.includes("FROM completeful_catalog_variants")) {
            return {
              results: [
                {
                  completeful_variant_id: "variant-1",
                  completeful_product_id: product?.completeful_product_id,
                  variant_title: "Black / S",
                  raw_json: "{}",
                },
              ],
            };
          }
          if (sql.includes("FROM completeful_catalog_print_locations")) {
            return { results: [] };
          }
          if (sql.includes("FROM completeful_catalog_images")) {
            return { results: images };
          }
          if (sql.includes("FROM completeful_catalog_mockups")) {
            return { results: [] };
          }
          throw new Error(`Unexpected all() query: ${sql}`);
        },
      };
      return statement;
    },
  };

  return { DB, calls };
}

test("product detail resolves child records by provider id and caps image previews", async () => {
  const product = {
    completeful_product_id: "provider-product-123",
    catalog_product_id: "catalog-product-abc",
    name: "Large image catalog product",
    raw_json: "{}",
  };
  const images = Array.from({ length: 24 }, (_, index) => ({
    completeful_product_id: product.completeful_product_id,
    image_id: `image-${index + 1}`,
    url: `https://example.test/image-${index + 1}.jpg`,
    raw_json: "{}",
  }));

  const { DB, calls } = createDb({
    product,
    imageTotal: 4356,
    images,
  });

  const detail = await getCompletefulCatalogProduct(
    { DB },
    "catalog-product-abc",
  );

  assert.equal(detail.product.completeful_product_id, "provider-product-123");
  assert.equal("raw_json" in detail.product, false);
  assert.equal(detail.images.length, 24);
  assert.deepEqual(detail.image_pagination, {
    limit: 24,
    count: 24,
    total: 4356,
    has_more: true,
  });

  const relationCalls = calls.filter(
    ({ sql }) =>
      sql.includes("completeful_catalog_variants") ||
      sql.includes("completeful_catalog_print_locations") ||
      sql.includes("completeful_catalog_images") ||
      sql.includes("completeful_catalog_mockups"),
  );

  assert.ok(relationCalls.length >= 5);
  for (const call of relationCalls) {
    assert.equal(call.args[0], "provider-product-123");
  }

  const imageCall = calls.find(
    ({ sql }) =>
      sql.includes("FROM completeful_catalog_images") &&
      sql.includes("ORDER BY") &&
      sql.includes("LIMIT ?"),
  );
  assert.ok(imageCall, "detail image query must be explicitly limited");
  assert.deepEqual(imageCall.args, ["provider-product-123", 24]);
});

test("product detail returns null when the catalog product does not exist", async () => {
  const { DB } = createDb({ product: null });
  assert.equal(await getCompletefulCatalogProduct({ DB }, "missing"), null);
});
