import assert from "node:assert/strict";
import test from "node:test";
import { handleProductStudioAdminApi } from "../apps/ecommerce-cms-agentsam/backend/admin/product-studio.js";

function fixture({ preparedId = null, contentType = "image/png" } = {}) {
  const statements = [];
  const draft = {
    id: "draft-7",
    product_id: 7,
    completeful_catalog_product_id: "catalog-tee",
    selected_variant_ids_json: '["variant-m"]',
    print_locations_json: '["front"]',
    placement_json: "{}",
    original_media_asset_id: 10,
    prepared_media_asset_id: preparedId,
    completeful_shop_id: "shop-1",
    version: 1,
  };
  const DB = {
    prepare(sql) {
      return {
        bind(...params) {
          return {
            async first() {
              statements.push({ sql, params, mode: "first" });
              if (sql.includes("FROM product_studio_drafts")) return draft;
              if (sql.includes("FROM completeful_product_links")) return null;
              if (sql.includes("FROM products")) return { id: 7, price_cents: 3499 };
              if (sql.includes("FROM completeful_catalog_products")) {
                return { completeful_product_id: "catalog-tee", catalog_product_id: "catalog-tee" };
              }
              if (sql.includes("FROM completeful_catalog_variants")) {
                return { completeful_variant_id: "variant-m" };
              }
              if (sql.includes("FROM completeful_catalog_print_locations")) {
                return { print_location_id: "front", enabled: 1 };
              }
              if (sql.includes("FROM media_assets")) {
                return { id: preparedId, url: "/media/prepared.png", content_type: contentType };
              }
              throw new Error("Unexpected read in fixture: " + sql);
            },
            async run() {
              statements.push({ sql, params, mode: "write" });
              throw new Error("No database writes allowed before prepared artwork passes validation");
            },
          };
        },
      };
    },
  };
  return { env: { DB }, statements };
}

async function request(env, suffix) {
  const url = new URL("https://store.example/api/admin/product-studio/drafts/draft-7/" + suffix);
  const response = await handleProductStudioAdminApi(new Request(url, { method: "POST" }), env, url);
  return { response, body: await response.json() };
}

test("original-only Studio draft cannot create a provider product or mutate its commercial data", async () => {
  const { env, statements } = fixture();
  const { response, body } = await request(env, "create-product");
  assert.equal(response.status, 409);
  assert.equal(body.code, "production_artwork_not_prepared");
  assert.match(body.error, /Prepare production artwork/);
  assert.equal(statements.some((s) => s.mode === "write"), false);
  assert.equal(statements.some((s) => /completeful_operations/.test(s.sql)), false);
});

test("direct provider design route cannot bypass the prepared artwork requirement", async () => {
  const { env, statements } = fixture();
  const { response, body } = await request(env, "design");
  assert.equal(response.status, 409);
  assert.match(body.error, /Prepare production artwork/);
  assert.equal(statements.some((s) => s.mode === "write"), false);
  assert.equal(statements.some((s) => /completeful_catalog_products/.test(s.sql)), false);
});

test("a non-PNG prepared asset is rejected before any Completeful mutation", async () => {
  const { env, statements } = fixture({ preparedId: 22, contentType: "image/jpeg" });
  const { response, body } = await request(env, "design");
  assert.equal(response.status, 409);
  assert.match(body.error, /uploaded PNG/);
  assert.equal(statements.some((s) => s.mode === "write"), false);
  assert.equal(statements.some((s) => /completeful_operations/.test(s.sql)), false);
});
