import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = (path) => readFileSync(path, "utf8");
const studio = read("apps/ecommerce-cms-agentsam/frontend/src/pages/products/StudioWorkspace.tsx");
const studioBackend = read("apps/ecommerce-cms-agentsam/backend/admin/product-studio.js");
const productApi = read("apps/ecommerce-cms-agentsam/backend/admin/api.js");
const productEdit = read("apps/ecommerce-cms-agentsam/frontend/static/product-edit.html");
const productCss = read("apps/ecommerce-cms-agentsam/frontend/static/css/product-edit.css");

test("Next Step awaits durable Studio save and navigates using the returned local product id", () => {
  assert.match(studio, /const needsPreparation = !preparedAsset \|\| preparedFor !== currentPlacementKey/);
  assert.match(studio, /needsPreparation \? await prepareArtwork\(\) : await saveDraft\(\)/);
  assert.match(studio, /const saved = await saveDraft\(uploaded, preview \|\| null, finalScale\)/);
  assert.match(studio, /Number\.isSafeInteger\(productId\)/);
  assert.match(studio, /window\.location\.assign\("\/admin\/product-edit\?id="/);
  assert.match(studio, /Save design/);
  assert.match(studio, /Next step · Product details/);
  assert.doesNotMatch(studio, /Create Completeful \+ store product/);
  assert.doesNotMatch(studio, /Publish to store/);
  assert.doesNotMatch(studio, /Storefront description/);
  assert.doesNotMatch(studio, /Retail price \(USD\)/);
});

test("Studio saves a draft without rewriting its commercial title, description, and price", () => {
  const draftSave = studioBackend.slice(studioBackend.indexOf("async function saveDraft("), studioBackend.indexOf("async function getDraft("));
  assert.doesNotMatch(draftSave, /UPDATE products SET title =/);
  assert.match(draftSave, /price = Math\.max\(0, Number\(product\.price_cents/);
  assert.match(draftSave, /Object\.hasOwn\(body, field\)/);
  assert.match(draftSave, /INSERT OR IGNORE INTO product_images/);
  assert.match(draftSave, /COALESCE\(image_url, \?\)/);
  assert.match(studioBackend, /createProductFromDraft/);
  assert.match(studioBackend, /Number\(product\.price_cents\) <= 0/);
  assert.match(studioBackend, /already_linked: true/);
  assert.match(studioBackend, /state = CASE WHEN state IN \('draft','prepared','error'\) THEN \? ELSE state END/);
});

test("Product Editor has top-right persistence actions, verified saves, design handoff, and guarded publishing", () => {
  const header = productEdit.slice(productEdit.indexOf('<header class="product-editor-top">'), productEdit.indexOf('</header>'));
  assert.match(header, /id="save-hint"/);
  assert.match(header, /id="discard-btn"/);
  assert.match(header, /id="save-btn"/);
  assert.doesNotMatch(productEdit, /<footer class="product-editor-bar">/);
  assert.match(productEdit, /Save did not verify against the stored product/);
  assert.match(productEdit, /const additionalEdits = JSON\.stringify\(collectPayload\(\)\) !== saveSnapshot/);
  assert.match(productEdit, /renderStudioDesign\(d\.design_draft, d\.fulfillment, d\.source, d\.selling_selection\)/);
  assert.match(productEdit, /Create with Completeful/);
  assert.match(productEdit, /\/admin\/products\/create\//);
  assert.match(productEdit, /create-provider-product-btn/);
  assert.match(productCss, /\.product-editor-save-actions/);
  assert.match(productApi, /design_draft: designDraft \|\| null/);
  assert.match(productApi, /selling_selection: sellingSelection/);
  assert.match(productApi, /Create and map this product with Completeful before publishing/);
  assert.match(productApi, /COALESCE\(\?, image_url\)/);
  assert.match(productApi, /Array\.isArray\(body\.variants\)/);
  assert.match(productApi, /UPDATE product_variants SET/);
  assert.match(productApi, /await env\.DB\.batch\(writes\)/);
});
