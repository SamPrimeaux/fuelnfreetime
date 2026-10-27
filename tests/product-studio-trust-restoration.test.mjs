import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { selectStudioSideImage } from "../apps/ecommerce-cms-agentsam/frontend/src/pages/products/studio-side-image.ts";

const read = (name) => readFile(new URL(name, import.meta.url), "utf8");

test("Product Details Edit design resumes the existing draft instead of the catalog intro", async () => {
  const [productEdit, page, studio] = await Promise.all([
    read("../apps/ecommerce-cms-agentsam/frontend/static/product-edit.html"),
    read("../apps/ecommerce-cms-agentsam/frontend/src/pages/products/ProductStudioPage.tsx"),
    read("../apps/ecommerce-cms-agentsam/frontend/src/pages/products/StudioWorkspace.tsx"),
  ]);
  assert.match(productEdit, /"\?resume=" \+ encodeURIComponent\(draft\.id\)/);
  assert.match(page, /useLocation\(\)/);
  assert.match(page, /useState\(Boolean\(resumeDraftId\)\)/);
  assert.match(page, /resumeDraftId=\{resumeDraftId\}/);
  assert.match(studio, /saved\?\.id !== resumeDraftId/);
});

test("saved media is restored by exact asset IDs, independent of gallery pagination", async () => {
  const src = await read("../apps/ecommerce-cms-agentsam/frontend/src/pages/products/StudioWorkspace.tsx");
  assert.match(src, /Promise\.all\(ids\.map\(async \(id\) =>/);
  assert.match(src, /adminFetch<\{ asset: MediaAsset \}>\(`\/api\/admin\/media\/\$\{id\}`/);
  assert.doesNotMatch(src, /adminFetch<\{ assets: MediaAsset\[\] \}>\("\/api\/admin\/media\?view=all"/);
  assert.match(src, /Restoring saved design and artwork/);
});

test("Gildan 2400 cannot display or save a made-up Back product photo", async () => {
  const src = await read("../apps/ecommerce-cms-agentsam/frontend/src/pages/products/StudioWorkspace.tsx");
  const product = "gildan-2400";
  const front = "front-longsleeve.jpg";
  const back = selectStudioSideImage([], "back-location", "black-s", "front-location.jpg", front, false, { Color: "Black", Size: "S" });
  assert.equal(back, null, `${product} has no verified Back mockup`);
  assert.match(src, /A decorated photo requires a Completeful render/);
  assert.match(src, /backgroundUrl = designImage/);
  assert.doesNotMatch(src, /NeutralGarmentSilhouette/);
  assert.doesNotMatch(src, /const backgroundUrl = location\?\.artboard_image_url \|\| baseImage/);
});

test("technical print dimensions no longer appear as repeated labels over the garment", async () => {
  const src = await read("../apps/ecommerce-cms-agentsam/frontend/src/pages/products/StudioWorkspace.tsx");
  const css = await read("../apps/ecommerce-cms-agentsam/frontend/src/styles/product-studio.css");
  assert.match(src, /ps-print-details/);
  assert.doesNotMatch(src, /<span className="ps-design-dimensions">/);
  assert.match(src, /ps-header-artwork-tools/);
  assert.match(css, /\.ps-header-artwork-tools/);
});

test("resize corners have direction-aware pointer math and the correct diagonal cursors", async () => {
  const [src, css] = await Promise.all([
    read("../apps/ecommerce-cms-agentsam/frontend/src/pages/products/StudioWorkspace.tsx"),
    read("../apps/ecommerce-cms-agentsam/frontend/src/styles/product-studio.css"),
  ]);
  assert.match(src, /from\.corner\.endsWith\("r"\) \? dx : -dx/);
  assert.match(src, /from\.corner\.startsWith\("b"\) \? dy : -dy/);
  assert.match(src, /startDrag\(event, "resize", corner\)/);
  assert.match(css, /\.ps-selection-handle--tr,[\s\S]*?\.ps-selection-handle--bl \{ cursor: nesw-resize;/);
});

test("supplier catalog drafts never pretend missing variants are warehouse stock", async () => {
  const productEdit = await read("../apps/ecommerce-cms-agentsam/frontend/static/product-edit.html");
  assert.match(productEdit, /supplierDraft\s*=\s*false/);
  assert.match(productEdit, /Your selected sizes and colors are saved/);
  assert.match(productEdit, /card.hidden = Boolean\(supplierDraft\)/);
  assert.match(productEdit, /add\.hidden = supplierDraft/);
  assert.match(productEdit, /Boolean\(d\.design_draft\?\.completeful_catalog_product_id \|\| d\.fulfillment\?\.completeful_store_product_id\)/);
});
