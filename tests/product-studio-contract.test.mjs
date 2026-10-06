import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { getCompletefulCatalogProduct } from "../apps/ecommerce-cms-agentsam/backend/completeful/catalog.js";

const PRODUCT_FIXTURES = [
  {
    name: "148-image Comfort Colors shirt",
    id: "47d3afff-3e4c-492a-8e8b-2dcfca38caa1",
    total: 148,
    returned: 24,
    hasMore: true,
  },
  {
    name: "7-image 11x17 Bamboo Cutting Board",
    id: "555100fd-13cf-46a0-b6ec-1a73fa625a2f",
    total: 7,
    returned: 7,
    hasMore: false,
  },
];

function imageRows(productId, count) {
  return Array.from({ length: count }, (_, index) => ({
    completeful_product_id: productId,
    image_id: `image-${index + 1}`,
    url: `https://example.test/${productId}/image-${index + 1}.jpg`,
    raw_json: "{}",
  }));
}

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
          if (sql.includes("FROM completeful_catalog_print_locations")) return { results: [] };
          if (sql.includes("FROM completeful_catalog_images")) return { results: images };
          if (sql.includes("FROM completeful_catalog_mockups")) return { results: [] };
          throw new Error(`Unexpected all() query: ${sql}`);
        },
      };
      return statement;
    },
  };

  return { DB, calls };
}

for (const fixture of PRODUCT_FIXTURES) {
  test(`product detail bounds gallery data for ${fixture.name}`, async () => {
    const product = {
      completeful_product_id: fixture.id,
      catalog_product_id: fixture.id,
      name: fixture.name,
      raw_json: "{}",
    };
    const { DB, calls } = createDb({
      product,
      imageTotal: fixture.total,
      images: imageRows(fixture.id, fixture.returned),
    });

    const detail = await getCompletefulCatalogProduct({ DB }, fixture.id);

    assert.equal(detail.product.completeful_product_id, fixture.id);
    assert.equal("raw_json" in detail.product, false);
    assert.equal(detail.images.length, fixture.returned);
    assert.deepEqual(detail.image_pagination, {
      limit: 24,
      count: fixture.returned,
      total: fixture.total,
      has_more: fixture.hasMore,
    });

    const relationCalls = calls.filter(
      ({ sql }) =>
        sql.includes("completeful_catalog_variants") ||
        sql.includes("completeful_catalog_print_locations") ||
        sql.includes("completeful_catalog_images") ||
        sql.includes("completeful_catalog_mockups"),
    );
    assert.ok(relationCalls.length >= 5);
    for (const call of relationCalls) assert.equal(call.args[0], fixture.id);

    const imageCall = calls.find(
      ({ sql }) =>
        sql.includes("FROM completeful_catalog_images") &&
        sql.includes("ORDER BY") &&
        sql.includes("LIMIT ?"),
    );
    assert.ok(imageCall, "detail image query must be explicitly limited");
    assert.deepEqual(imageCall.args, [fixture.id, 24]);
  });
}

test("Product Studio detail grid and gallery rail cannot expand intrinsic workspace width", async () => {
  const css = await readFile(
    new URL("../apps/ecommerce-cms-agentsam/frontend/src/styles/product-studio.css", import.meta.url),
    "utf8",
  );
  assert.match(css, /grid-template-columns:\s*minmax\(0, 1\.15fr\)\s+minmax\(0, 1fr\)/);
  assert.match(css, /\.ps-detail\s*>\s*\*\s*\{[^}]*min-width:\s*0/s);
  assert.match(css, /\.ps-thumbnails\s*\{[^}]*max-width:\s*100%[^}]*overflow-x:\s*auto[^}]*contain:\s*inline-size/s);
});

test("AgentSam annotation never binds to the admin shell", async () => {
  const source = await readFile(
    new URL("../apps/ecommerce-cms-agentsam/frontend/inspector.js", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(source, /watch\(document\)/);
  assert.match(source, /url\.origin === location\.origin/);
  assert.match(source, /!url\.pathname\.startsWith\('\/admin'\)/);
  assert.match(source, /button\.disabled = !available/);
});

test("product detail returns null when the catalog product does not exist", async () => {
  const { DB } = createDb({ product: null });
  assert.equal(await getCompletefulCatalogProduct({ DB }, "missing"), null);
});

test("Product Studio persistence and Completeful mutations are server-side contracts", async () => {
  const [backend, workspace, migration] = await Promise.all([
    readFile(
      new URL("../apps/ecommerce-cms-agentsam/backend/admin/product-studio.js", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../apps/ecommerce-cms-agentsam/frontend/src/pages/products/StudioWorkspace.tsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../db/migrate-product-studio-drafts-20260929.sql", import.meta.url),
      "utf8",
    ),
  ]);

  assert.match(migration, /CREATE TABLE IF NOT EXISTS product_studio_drafts/);
  assert.match(migration, /original_media_asset_id/);
  assert.match(migration, /prepared_media_asset_id/);
  assert.match(migration, /preview_media_asset_id/);
  assert.match(migration, /completeful_design_id/);
  assert.match(migration, /completeful_render_id/);
  assert.match(migration, /retail_price_cents/);

  assert.match(backend, /completefulRequest\(env, "POST", "\/designs"/);
  assert.match(backend, /completefulRequest\(env, "POST", "\/mockups\/renders"/);
  assert.match(backend, /`\/shops\/\$\{encodeURIComponent\(shopId\)\}\/products`/);
  assert.match(backend, /completeful_operations/);
  assert.match(backend, /completeful_product_links/);
  assert.match(backend, /completeful_variant_links/);
  assert.match(backend, /mode: "placement_preview"/);
  assert.match(backend, /reason: "no_provider_mockups"/);

  assert.match(workspace, /\/api\/admin\/product-studio\/drafts/);
  assert.match(workspace, /Prepare for print/);
  assert.match(workspace, /Render Completeful mockup/);
  assert.match(workspace, /Next step · Product details/);
  assert.match(workspace, /continueToProductDetails/);
  assert.doesNotMatch(workspace, /Storefront description/);
  assert.doesNotMatch(workspace, /Retail price \(USD\)/);
  assert.match(backend, /createProductFromDraft/);
  assert.doesNotMatch(workspace, /product-design\.json/);
  assert.doesNotMatch(workspace, /Download design layout/);
});

test("artwork preparation is opt-in and preserves the original asset", async () => {
  const workspace = await readFile(
    new URL("../apps/ecommerce-cms-agentsam/frontend/src/pages/products/StudioWorkspace.tsx", import.meta.url),
    "utf8",
  );
  assert.match(workspace, /Remove connected flat background/);
  assert.match(workspace, /checked=\{removeFlatBackground\}/);
  assert.match(workspace, /Trim transparent edges/);
  assert.match(workspace, /Original artwork is unchanged/);
  assert.match(workspace, /Original and prepared artwork comparison/);
  assert.match(workspace, /studio\/prepared/);
  assert.match(workspace, /removeConnectedFlatBackground/);
  assert.match(workspace, /alphaBounds/);
});
