import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { selectStudioSideImage } from "../apps/ecommerce-cms-agentsam/frontend/src/pages/products/studio-side-image.ts";
import { resolveSelectedResource } from "../apps/ecommerce-cms-agentsam/backend/agentsam/selected-resource.js";

const read = (relative) => readFile(new URL(relative, import.meta.url), "utf8");

test("Completeful real Color-scoped Front/Back mockups replace the crude black fallback", () => {
  const front = "f542b57d-5aa6-429a-a163-81f9eb9cf55c";
  const back = "4a6300a3-7a4c-488f-837a-e5826df3a474";
  const mockups = ["Black", "Brick", "Denim", "Ivory", "Moss", "Pepper"].flatMap((color) => [
    { print_location_id: front, preview_url: `https://example.test/front-${color}.png`, variant_scope_json: JSON.stringify({ Color: color }), active: 1 },
    { print_location_id: back, preview_url: `https://example.test/back-${color}.png`, variant_scope_json: JSON.stringify({ Color: color }), active: 1 },
  ]);
  for (const color of ["Black", "Brick", "Denim", "Ivory", "Moss", "Pepper"]) {
    const attrs = { Size: "S", Color: color };
    assert.equal(selectStudioSideImage(mockups, front, "id-for-" + color, null, null, true, attrs),
      `https://example.test/front-${color}.png`);
    assert.equal(selectStudioSideImage(mockups, back, "id-for-" + color, "https://example.test/black-artboard.png", null, false, attrs),
      `https://example.test/back-${color}.png`);
  }
  assert.equal(selectStudioSideImage(mockups, back, "unknown", null, null, false, { Color: "Other" }), null);
  assert.equal(selectStudioSideImage(mockups, back, "moss", null, null, false, { color: "mOsS" }),
    "https://example.test/back-Moss.png");
});

test("Completeful preview never accepts a mockup scoped to another color", () => {
  const mockups = [{ print_location_id: "back", preview_url: "https://example.test/black.png",
    variant_scope_json: '{"Color":"Black"}', active: 1 }];
  assert.equal(selectStudioSideImage(mockups, "back", "moss-variant", null, null, false, { Color: "Moss" }), null);
  assert.equal(selectStudioSideImage(mockups, "back", "black-variant", null, null, false, { Color: "Black" }), "https://example.test/black.png");
});

function fakeDb() {
  const queries = [];
  const DB = {
    prepare(sql) {
      const query = { sql, args: [] };
      queries.push(query);
      return {
        bind(...args) {
          query.args = args;
          return {
            async first() {
              if (sql.includes("FROM completeful_catalog_products")) return args[0] === "garment" ? {
                completeful_product_id: "garment", name: "Garment"
              } : null;
              if (sql.includes("FROM completeful_catalog_variants")) return args[1] === "moss" ? {
                completeful_variant_id: "moss", variant_title: "Moss / S"
              } : null;
              if (sql.includes("FROM completeful_catalog_print_locations")) return args[1] === "back" ? {
                print_location_id: "back", name: "Back", file_width: 14, file_height: 16, dpi: 300, unit: "in"
              } : null;
              return null;
            },
            async all() {
              if (sql.includes("FROM media_assets")) return { results: [{
                id: 7, filename: "logo.png", r2_key: "logos/logo.png", content_type: "image/png",
                size_bytes: 201, folder: "images", category: "logo", alt_text: "", meta_json: "{}"
              }] };
              throw new Error("Unexpected query: " + sql);
            },
          };
        }
      };
    }
  };
  return { DB, queries };
}

test("miniAgentSam selected Product Studio resource is verified server-side before use", async () => {
  const { DB } = fakeDb();
  const selected = await resolveSelectedResource({ DB }, {
    type: "product_artwork", surface: "product-studio",
    productId: "garment", variantId: "moss", locationId: "back", assetId: 7,
  });
  assert.equal(selected.surface, "product-studio");
  assert.equal(selected.product.name, "Garment");
  assert.equal(selected.variant.name, "Moss / S");
  assert.equal(selected.location.name, "Back");
  assert.equal(selected.artwork.id, 7);
  await assert.rejects(resolveSelectedResource({ DB }, {
    type: "product_artwork", surface: "product-studio",
    productId: "garment", variantId: "other", locationId: "back"
  }), /variant unavailable/);
  await assert.rejects(resolveSelectedResource({ DB }, {
    type: "product_artwork", surface: "product-studio",
    productId: "garment", variantId: "moss", locationId: "not-back"
  }), /location unavailable/);
});

test("miniAgentSam global trigger forwards the current Product Studio resource to chat", async () => {
  const src = await read("../apps/ecommerce-cms-agentsam/frontend/src/pages/products/StudioWorkspace.tsx");
  // Product Studio now claims the shared header's crosshair instead of rendering a second local trigger.
  assert.match(src, /window\.addEventListener\("agentsam:mini-open", claim\)/);
  assert.match(src, /event\.preventDefault\(\); openMiniRef\.current\(\)/);
  assert.match(src, /miniRef\.current\.select\(/);
  assert.match(src, /type: "product_artwork", surface: "product-studio"/);
  assert.match(src, /productId: catalogId, variantId, locationId, assetId: asset\?\.id \|\| null/);
  assert.match(src, /selected_resource: selectedResource/);
  assert.match(src, /send: \(\{ prompt: text, signal, resource \}\) => miniSendRef\.current\(text, signal, resource\)/);
  assert.match(src, /askAI\(generate, message, signal, resource\)/);
  assert.match(src, /new CustomEvent\("agentsam:mini-state"/);
  assert.doesNotMatch(src, /Brainstorm three concise visual directions/);
  assert.doesNotMatch(src, /className="ps-studio-context"/);
});

test("product details never calls provider product creation 'connecting the API'", async () => {
  const [page, backend] = await Promise.all([
    read("../apps/ecommerce-cms-agentsam/frontend/static/product-edit.html"),
    read("../apps/ecommerce-cms-agentsam/backend/admin/product-studio.js"),
  ]);
  assert.doesNotMatch(page, /Connect Completeful fulfillment|Supplier: Completeful · not_connected/);
  assert.match(page, /Create with Completeful/);
  assert.match(page, /window\.confirm\("Create this product in your connected Completeful shop/);
  assert.match(page, /\/create-product"/);
  assert.match(backend, /already_linked: true/);
  assert.match(backend, /return rows\.find\(\(row\) => \{/);
  assert.doesNotMatch(backend, /\|\| rows\[0\]/);
});
