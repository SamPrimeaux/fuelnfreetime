import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const studio = source("apps/ecommerce-cms-agentsam/frontend/src/pages/brand/BrandStudioPage.tsx");
const routes = source("apps/ecommerce-cms-agentsam/backend/lib/route-manifest.js");
const app = source("apps/ecommerce-cms-agentsam/frontend/src/App.tsx");
const content = source("apps/ecommerce-cms-agentsam/frontend/static/content.html");

test("Brand Studio is a typed embedded route with one canonical Content entrypoint", () => {
  assert.match(routes, /admin\.brand-studio.*\/admin\/content\/brand.*admin-spa/);
  assert.match(app, /path="content\/brand" element={<BrandStudioPage/);
  assert.match(content, /href="\/admin\/content\/brand" aria-label="Open Brand Studio"/);
  assert.doesNotMatch(studio, /renderShell\s*\(|createRoot\s*\(/);
});

test("Brand Studio works with the established brand data authority", () => {
  assert.match(studio, /\/api\/admin\/brand\?include_assets=0/);
  assert.match(studio, /method: "PATCH"/);
  assert.match(studio, /brand\/assets\?page=/);
  assert.match(studio, /media_asset_id: id/);
  assert.match(studio, /clear_role: role/);
});

test("Visual boards use existing media album APIs, not replacement persistence", () => {
  assert.match(studio, /\/api\/admin\/media\/albums/);
  assert.match(studio, /action: "album_add" \| "album_remove"/);
  assert.match(studio, /\/api\/admin\/media\/batch/);
  assert.match(studio, /bs-board-/);
  assert.doesNotMatch(studio, /localStorage|indexedDB|CREATE TABLE/);
});

test("Theme editing remains a handoff to real CMS surfaces", () => {
  for (const href of ["/admin/theme-editor", "/admin/theme-workspace", "/admin/pages", "/admin/scene-lab"]) {
    assert.ok(studio.includes('href="' + href + '"'), href);
  }
  assert.doesNotMatch(studio, /Publish now|fake-preview|placeholder-storefront/);
});
