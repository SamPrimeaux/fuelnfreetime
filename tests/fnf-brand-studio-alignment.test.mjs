import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (filename) => readFileSync(resolve(root, filename), "utf8");

test("brand media registry points to six real reviewed preview source files", () => {
  const registry = JSON.parse(read("docs/brand/fnf/creative/asset-registry.json"));
  const family = registry.assets.find((asset) => asset.id === "fnf-ft-shield-badge-v1");
  assert.ok(family);
  assert.equal(family.production_approved, false);
  assert.equal(family.cms_media.published_to_storefront, false);
  assert.equal(family.cms_media.album_slug, "fnf-identity-review-v1");
  assert.equal(family.variants.length, 6);
  for (const variant of family.variants) {
    assert.ok(existsSync(resolve(root, "docs/brand/fnf", variant.svg)), variant.svg);
    assert.ok(existsSync(resolve(root, "docs/brand/fnf", "identity/artwork/v1/extracted/FNF_Logo_Masters_v1/02_Transparent_PNG", variant.preview_r2_key.split("/").at(-1))));
  }
});

test("Product Studio canvas starts expanded and is variant-aware", () => {
  const studio = read("apps/ecommerce-cms-agentsam/frontend/src/pages/products/StudioWorkspace.tsx");
  const css = read("apps/ecommerce-cms-agentsam/frontend/src/styles/product-studio.css");
  assert.match(studio, /setPanelOpen\] = useState\(false\)/);
  assert.match(studio, /ps-mini-map/);
  assert.match(studio, /ps-artwork-toolbar/);
  assert.match(studio, /variantImage\(variant\) \|\| location\?\.artboard_image_url/);
  assert.match(studio, /setProviderRenderUrl\(null\).*provider render belongs/s);
  assert.match(css, /ps-workspace-body\.is-panel-collapsed/);
  assert.match(css, /@media \(max-width: 760px\)/);
});

test("media deletion actions and upload error responses are exposed in existing library", () => {
  const media = read("apps/ecommerce-cms-agentsam/frontend/static/js/media-library.js");
  assert.match(media, /data-media-album-delete/);
  assert.match(media, /async function deleteAlbum/);
  assert.match(media, /async function deleteSelection/);
  assert.match(media, /data-media-batch="delete"/);
  assert.match(media, /const body = await res\.text\(\)/);
  assert.match(media, /res\.status === 413/);
});

test("brand uploader is explicit and no-op by default", () => {
  const importer = read("scripts/import-fnf-brand-previews.mjs");
  assert.match(importer, /process\.argv\.includes\("--apply"\)/);
  assert.match(importer, /if \(!apply\) \{/);
  assert.match(importer, /INSERT OR IGNORE INTO media_assets/);
  assert.match(importer, /INSERT OR IGNORE INTO media_album_assets/);
});
