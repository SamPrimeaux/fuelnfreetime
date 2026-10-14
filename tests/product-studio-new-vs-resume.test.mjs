import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
const source = async (p) => readFile(new URL(p, import.meta.url), "utf8");

test("Start designing a selected Royal Blue variant does not restore old Black artwork or selection", async () => {
  const [studio, page] = await Promise.all([
    source("../apps/ecommerce-cms-agentsam/frontend/src/pages/products/StudioWorkspace.tsx"),
    source("../apps/ecommerce-cms-agentsam/frontend/src/pages/products/ProductStudioPage.tsx"),
  ]);
  assert.match(page, /initialVariantId=\{selectedVariantId\}/);
  assert.match(page, /resumeDraftId=\{resumeDraftId\}/);
  assert.match(studio, /const \[variantId, setVariantId\] = useState\(/);
  assert.match(studio, /if \(!resumeDraftId\) \{ setRestoringDraft\(false\); return; \}/);
  assert.match(studio, /force_new: !draft && !resumeDraftId/);
  assert.doesNotMatch(studio, /\/drafts\?catalog_product_id=/,
    "A new Studio session must not load the last saved catalog product draft");
});

test("Edit design restores only its explicit draft ID, not the most recently saved sibling", async () => {
  const [studio, editor] = await Promise.all([
    source("../apps/ecommerce-cms-agentsam/frontend/src/pages/products/StudioWorkspace.tsx"),
    source("../apps/ecommerce-cms-agentsam/frontend/static/product-edit.html"),
  ]);
  assert.match(editor, /"\?resume=" \+ encodeURIComponent\(draft\.id\)/);
  assert.match(studio, /\/drafts\/\$\{encodeURIComponent\(resumeDraftId\)\}/);
  assert.match(studio, /saved\?\.completeful_catalog_product_id !== catalogId/);
  assert.match(studio, /saved\?\.id !== resumeDraftId/);
});

test("Backend force_new never reuses existing product or latest garment design", async () => {
  const backend = await source("../apps/ecommerce-cms-agentsam/backend/admin/product-studio.js");
  assert.match(backend, /if \(body\.force_new && \(body\.id \|\| body\.product_id\)\)/);
  assert.match(backend, /let draft = body\.force_new \? null/);
  assert.match(backend, /: body\.id \? await loadDraft\(env, String\(body\.id\)\)/);
  assert.match(backend, /await ensureDraftProduct\(env, body\.force_new \? \{ \.\.\.body, product_id: null \} : body, selection\.product\)/);
  assert.match(backend, /if \(body\.id && !draft\)/);
  assert.match(backend, /draft\.completeful_catalog_product_id !== selection\.resolvedProductId/);
});
