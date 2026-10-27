import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const read = (relative) => readFile(new URL(relative, import.meta.url), "utf8");

test("studio artwork picker uses image-only provider data and existing album filtering", async () => {
  const workspace = await read("../apps/ecommerce-cms-agentsam/frontend/src/pages/products/StudioWorkspace.tsx");
  const api = await read("../apps/ecommerce-cms-agentsam/backend/admin/api.js");
  assert.match(workspace, /view: "images", page_size: "48", page: String\(mediaPage\)/);
  assert.match(workspace, /album_id: String\(albumId\)/);
  assert.match(workspace, /q: mediaQuery/);
  assert.match(workspace, /action: "album_add", ids: \[uploaded\.id\], album_id: albumId/);
  assert.match(workspace, /<select className="ps-asset-album"/);
  assert.match(workspace, /href="\/admin\/media" title="Organize media albums"/);
  assert.match(api, /"\/api\/admin\/media\/albums" && method === "GET"/);
  assert.match(api, /"\/api\/admin\/media\/batch" && method === "POST"/);
});

test("artwork gallery has two substantial square tiles per row, including mobile", async () => {
  const css = await read("../apps/ecommerce-cms-agentsam/frontend/src/styles/product-studio.css");
  assert.match(css, /\.ps-asset-rail \.ps-media-grid \{[\s\S]*?grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
  assert.match(css, /\.ps-asset-rail \.ps-media-grid \{[\s\S]*?grid-auto-rows: max-content;/);
  assert.match(css, /\.ps-asset-rail \.ps-media-grid img \{[\s\S]*?aspect-ratio: 1 \/ 1;/);
  assert.match(css, /@media \(max-width: 760px\) \{[\s\S]*?\.ps-asset-rail \.ps-media-grid \{\s*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
});

test("canvas uses viewport height and provider artboard ratio without shading empty print bounds", async () => {
  const css = await read("../apps/ecommerce-cms-agentsam/frontend/src/styles/product-studio.css");
  const workspace = await read("../apps/ecommerce-cms-agentsam/frontend/src/pages/products/StudioWorkspace.tsx");
  assert.match(workspace, /width: `min\(100%, 880px, calc\(\(100dvh - 350px\) \* \$\{artboardAspectRatio\}\)\)`/);
  assert.match(css, /min-height: max\(510px, calc\(100dvh - 220px\)\)/);
  assert.match(css, /\.ps-design-print-area \.ps-placement-empty \{\s*background: transparent;/);
  assert.match(workspace, /const \[guides, setGuides\] = useState\(false\)/);
  assert.doesNotMatch(workspace, /<strong>Print area<\/strong>/);
});

test("unverified Back views never impersonate a real garment through a generic silhouette", async () => {
  const workspace = await read("../apps/ecommerce-cms-agentsam/frontend/src/pages/products/StudioWorkspace.tsx");
  const resolver = await read("../apps/ecommerce-cms-agentsam/frontend/src/pages/products/studio-side-image.ts");
  assert.match(workspace, /A decorated photo requires a Completeful render/);
  assert.match(workspace, /ps-mini-unverified/);
  assert.doesNotMatch(workspace, /NeutralGarmentSilhouette/);
  assert.match(resolver, /if \(isFront\) return frontVariantImage \|\| artboardImage \|\| null;/);
  assert.match(resolver, /return null;\s*\}/);
});

test("Front and Back preview cards retain their own placement and refuse stale supplier renders", async () => {
  const workspace = await read("../apps/ecommerce-cms-agentsam/frontend/src/pages/products/StudioWorkspace.tsx");
  const backend = await read("../apps/ecommerce-cms-agentsam/backend/admin/product-studio.js");
  assert.match(workspace, /sideReviewCards = enabledLocations\.map/);
  assert.match(workspace, /sidePlacements\[id\]/);
  assert.match(workspace, /onClick=\{\(\) => choosePrintLocation\(side\.id\)\}/);
  assert.match(workspace, /const verifiedRender = previewIsCurrent \? supplierMockups\.find/);
  assert.match(workspace, /const preview = sideBaseImage \? await persistPlacementPreview\(uploaded, area, sideBaseImage\)/);
  assert.match(backend, /Object\.values\(sides\)[\s\S]*?side\.preview_media_asset_id/);
  assert.match(backend, /INSERT OR IGNORE INTO product_images/);
});

test("Front/Back previews share the minimap and enlarged preview, without inventing colored garments", async () => {
  const component = await read("../apps/ecommerce-cms-agentsam/frontend/src/pages/products/StudioWorkspace.tsx");
  const styles = await read("../apps/ecommerce-cms-agentsam/frontend/src/styles/product-studio.css");
  const start = component.indexOf('<div className="ps-mini-map"');
  const enlarged = component.indexOf('className="ps-preview-dialog"', start);
  const colorRail = component.indexOf('className="ps-colorway-rail"', start);
  assert.ok(start > -1 && enlarged > start && colorRail > start);
  assert.match(component.slice(start, colorRail), /renderSideReviewCards\("mini"\)/);
  assert.match(component.slice(enlarged), /renderSideReviewCards\("expanded"\)/);
  assert.match(component, /exactCatalogSideReference\(detail\.mockups/);
  assert.match(component, /const designImage = exactBackColorReference \? null : selectStudioSideImage/);
  assert.match(component, /Supplier color sample only; your saved artwork is shown separately/);
  assert.match(component, /side\.referenceOnly && side\.placed\?\.asset/);
  assert.match(styles, /ps-preview-dialog-body/);
  assert.match(styles, /ps-mini-map \.ps-side-review-cards--mini/);
});
