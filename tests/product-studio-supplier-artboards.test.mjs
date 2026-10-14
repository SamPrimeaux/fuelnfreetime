import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { selectStudioSideImage } from "../apps/ecommerce-cms-agentsam/frontend/src/pages/products/studio-side-image.ts";
import { liveCatalogDetail } from "../apps/ecommerce-cms-agentsam/backend/admin/completeful.js";

const read = async (p) => readFile(new URL(p, import.meta.url), "utf8");

test("supplier Left/Right artboards are shown when their source URLs are distinct", () => {
  const left = "https://provider.example/sunglasses-left.png";
  const right = "https://provider.example/sunglasses-right.png";
  assert.equal(selectStudioSideImage([], "left", "black", left, null, false, { Color: "Black" }, true), left);
  assert.equal(selectStudioSideImage([], "right", "black", right, null, false, { Color: "Black" }, true), right);
  assert.equal(selectStudioSideImage([], "back", "black", left, null, false, { Color: "Black" }, false), null,
    "Gildan shared front/back URL is not a verified rear mockup");
});

test("live Completeful product includes family-resolved mockups and normalizes supplier IDs", async () => {
  const previousFetch = globalThis.fetch;
  let called = 0;
  try {
    globalThis.fetch = async (req, init) => {
      called++;
      const url = new URL(String(req));
      assert.match(url.pathname, /\/v1\/catalog\/products\/sunglasses$/);
      assert.equal(url.searchParams.get("include"), "variants,print_locations,images,mockups,shipping");
      assert.equal(init.method, "GET");
      assert.equal(init.headers.get("Authorization"), "Bearer capp_test_fixture");
      return Response.json({ product: {
        id: "sunglasses", name: "Bamboo Frame Sunglasses", product_type: "ENGRAVING",
        variants: [{ id: "black", variant_title: "Black", variant_attributes: { Color: "Black" } }],
        print_locations: [
          { id: "left", name: "Left", enabled: true, artboard_image_url: "https://provider.example/left.png" },
          { id: "right", name: "Right", enabled: true, artboard_image_url: "https://provider.example/right.png" },
        ],
        mockups: [{ id: "mockup-left", print_location_id: "left", preview_url: "https://provider.example/mockup.png",
          variant_scope: { Color: "Black" } }],
        images: [{ id: "image1", url: "https://provider.example/catalog.png" }],
      } });
    };
    const mirrored = { product: { completeful_product_id: "sunglasses" },
      variants: [], print_locations: [], mockups: [], images: [], image_pagination: { limit: 96, count: 0, total: 0 } };
    const fresh = await liveCatalogDetail({ CAPP_KEY: "capp_test_fixture" }, "sunglasses", mirrored);
    assert.equal(called, 1);
    assert.equal(fresh.catalog_source, "supplier_live");
    assert.equal(fresh.variants[0].catalog_variant_id, "black");
    assert.equal(JSON.parse(fresh.variants[0].variant_attributes_json).Color, "Black");
    assert.deepEqual(fresh.print_locations.map(l => l.print_location_id), ["left", "right"]);
    assert.equal(fresh.mockups[0].mockup_id, "mockup-left");
    assert.equal(JSON.parse(fresh.mockups[0].variant_scope_json).Color, "Black");
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("Product Studio never suppresses the shared admin navigation", async () => {
  const [css, page, studio] = await Promise.all([
    read("../apps/ecommerce-cms-agentsam/frontend/src/styles/product-studio.css"),
    read("../apps/ecommerce-cms-agentsam/frontend/src/pages/products/ProductStudioPage.tsx"),
    read("../apps/ecommerce-cms-agentsam/frontend/src/pages/products/StudioWorkspace.tsx"),
  ]);
  assert.doesNotMatch(css, /product-studio-focused\.console-theme \{ --c-nav-w: 0px/);
  assert.doesNotMatch(css, /product-studio-focused \.console-sidenav\.admin-sidebar,\s*body\.product-studio-focused \.console-topbar-spacer \{ display: none !important;/);
  assert.match(page, /\?live=1/);
  assert.match(studio, /hasDistinctProviderSideArtboard/);
  assert.match(studio, /catalogWarning/);
  assert.match(studio, /needsPreparation \? await prepareArtwork\(\) : await saveDraft\(\)/);
});
