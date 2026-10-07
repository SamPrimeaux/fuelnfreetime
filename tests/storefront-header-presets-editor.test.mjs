import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { DEFAULT_NAV_CONFIG } from "../apps/ecommerce-cms-agentsam/backend/lib/site-nav.js";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("storefront header variants are packaged as reusable presets", async () => {
  const contract = JSON.parse(
    await read("packages/heuristic-theme/contracts/header-presets.json")
  );

  assert.equal(contract.defaultPreset, "adaptive-bar");
  assert.ok(contract.presets["adaptive-bar"]);
  assert.ok(contract.presets["frost-pill"]);
  assert.equal(contract.presets["frost-pill"].surface, "frost");
  assert.equal(DEFAULT_NAV_CONFIG.logoHeight, 58);
});

test("shop uses frost pill while the broader storefront uses adaptive bar", async () => {
  const shop = await read("packages/heuristic-theme/storefront/shop.html");
  assert.match(shop, /data-header-preset="frost-pill"/);

  for (const file of [
    "home.html",
    "about.html",
    "community.html",
    "collaborate.html",
    "policies.html",
    "terms.html",
  ]) {
    const html = await read(`packages/heuristic-theme/storefront/${file}`);
    assert.match(html, /data-header-preset="adaptive-bar"/, file);
  }
});

test("adaptive header owns contrast and old pages no longer carry duplicate header CSS", async () => {
  const shellJs = await read("packages/heuristic-theme/storefront/js/store-shell.js");
  const shellCss = await read("packages/heuristic-theme/storefront/css/store-shell.css");

  assert.match(shellJs, /header-presets\.json/);
  assert.match(shellJs, /sampleBackdropTone/);
  assert.match(shellJs, /data-header-tone/);
  assert.match(shellCss, /fnf-header--adaptive-bar\[data-header-tone="light"\]/);
  assert.match(shellCss, /fnf-header--adaptive-bar\[data-header-tone="dark"\]/);
  assert.match(shellCss, /fnf-header--frost-pill/);
  assert.match(shellCss, /--fnf-header-frost-surface: rgba\(248, 246, 241, 0\.72\)/);

  for (const file of ["about.html", "community.html"]) {
    const html = await read(`packages/heuristic-theme/storefront/${file}`);
    assert.doesNotMatch(html, /===== HEADER STYLES =====/);
    assert.match(html, /\/css\/store-shell\.css/);
  }
});

test("theme editor is the visual editor and page edit is presented as page settings", async () => {
  const themeEditor = await read(
    "apps/ecommerce-cms-agentsam/frontend/static/js/theme-editor.js"
  );
  const pageEditor = await read(
    "apps/ecommerce-cms-agentsam/frontend/static/page-edit.html"
  );

  assert.doesNotMatch(themeEditor, /Full editor/);
  assert.doesNotMatch(themeEditor, /te-full-editor/);
  assert.match(themeEditor, /Draft theme preview|Theme preview</);
  assert.match(themeEditor, /id="te-theme-name"/);
  assert.match(themeEditor, /data-drawer-mode="theme-settings"/);
  assert.doesNotMatch(themeEditor, /id="te-theme-trigger"/);
  assert.match(themeEditor, />Page settings</);
  assert.match(themeEditor, /Appearance and layout/);
  assert.match(themeEditor, /function renderInspectorGroups/);
  assert.doesNotMatch(themeEditor, /id="te-tabs"/);
  assert.match(themeEditor, /Page content &amp; settings/);

  assert.match(pageEditor, /Page Editor — Fuel & Free Time Admin/);
  assert.match(pageEditor, />Edit visually</);
  assert.match(pageEditor, />Page settings</);
  assert.match(pageEditor, /structuredClone\(current\?\.content \|\| \{\}\)/);
  assert.match(pageEditor, /\/api\/admin\/media\?view=all/);
  assert.match(pageEditor, /page-media-modal/);
  assert.match(pageEditor, /page-editor-media-card/);
  assert.doesNotMatch(pageEditor, /prompt\(/);
  assert.doesNotMatch(pageEditor, /duplicate-btn/);
  assert.doesNotMatch(pageEditor, /seo-edit-btn/);
  assert.doesNotMatch(pageEditor, /id="page-template"/);
});
