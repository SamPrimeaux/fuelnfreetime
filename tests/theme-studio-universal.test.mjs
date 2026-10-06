import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), "utf8");

test("Theme Studio has first-class global Header and Footer registry groups", () => {
  const source = read("apps/ecommerce-cms-agentsam/backend/cms/registry.js");
  assert.match(source, /header:\s*\{/);
  assert.match(source, /label:\s*"Header"/);
  assert.match(source, /key:\s*"nav-link"/);
  assert.match(source, /footer:\s*\{/);
  assert.match(source, /label:\s*"Global Footer"/);
  assert.match(source, /key:\s*"logoUrl".*Footer logo/s);
});

test("Theme Studio loads the visual preview runtime before the editor", () => {
  const html = read("apps/ecommerce-cms-agentsam/frontend/static/theme-editor.html");
  const runtime = html.indexOf("/admin/js/theme-preview-runtime.js");
  const editor = html.indexOf("/admin/js/theme-editor.js");
  assert.ok(runtime > 0);
  assert.ok(editor > runtime);
  assert.ok(html.indexOf("/admin/js/theme-preview-registry.js") < runtime);
});

test("visual theme runtime exposes Heuristic, all 24 Revise presets, and FNF", () => {
  const core = read("packages/theme-contract/runtime/theme-preview-registry.js");
  const adapter = read("packages/fnf-theme/src/editor/preview-adapter.js");
  const sandbox = { window: {} };
  vm.runInNewContext(core, sandbox);
  vm.runInNewContext(adapter, sandbox);
  const runtime = sandbox.window.ThemeStudioPreview;
  assert.deepEqual(Array.from(runtime.themes, (theme) => theme.id), ["heuristic", "revise", "fnf"]);
  assert.equal(runtime.catalog.revise.length, 24);
  assert.ok(runtime.catalog.fnf.length >= 5);
  assert.ok(runtime.catalog.heuristic.length >= 4);
  for (const entry of runtime.catalog.revise) {
    assert.ok(entry.templateKey);
    assert.ok(entry.preset.startsWith("revise/"));
  }
});

test("Add Section preserves visual preset metadata without creating another CMS authority", () => {
  const api = read("apps/ecommerce-cms-agentsam/backend/cms/api.js");
  assert.match(api, /body\.themePreset/);
  assert.match(api, /\.\.\.\(themePreset \? \{ themePreset \} : \{\}\)/);
  assert.doesNotMatch(api, /store_theme_pages/);
  assert.doesNotMatch(api, /store_themes/);
});

test("Theme Studio assembles actual Revise and FNF package assets", () => {
  const sync = read("scripts/sync-app-frontend.mjs");
  assert.match(sync, /@inneranimalmedia\/revise-theme\/dist/);
  assert.match(sync, /@inneranimalmedia\/section-library\/dist\/layout\.css/);
  assert.match(sync, /packages\/fnf-theme\/src\/theme\/tokens\.css/);
  assert.match(sync, /packages\/fnf-theme\/src\/sections\/scene-hero\/scene-hero\.css/);
  assert.match(sync, /theme-contract\/runtime\/theme-preview-registry\.js/);
  assert.match(sync, /fnf-theme\/src\/editor\/preview-adapter\.js/);
});

test("reusable template and theme package contracts exist", () => {
  const templateSchema = JSON.parse(read("packages/theme-contract/template-contract.v1.schema.json"));
  const packageSchema = JSON.parse(read("packages/theme-contract/theme-package-contract.v1.schema.json"));
  const example = JSON.parse(read("packages/theme-contract/examples/fnf-shop.template.json"));
  assert.equal(templateSchema.properties.contractVersion.const, 1);
  assert.equal(packageSchema.properties.contractVersion.const, 1);
  assert.equal(example.contractVersion, 1);
  assert.equal(example.layout.headerGroup, "site/header");
  assert.equal(example.layout.footerGroup, "site/footer");
  assert.ok(example.sections.every((section) => section.type && section.preset));
});

test('a second brand can register a new theme without modifying FNF code', () => {
  const sandbox = { window: {} };
  vm.runInNewContext(read('packages/theme-contract/runtime/theme-preview-registry.js'), sandbox);
  const registry = sandbox.window.ThemeStudioPreview;
  registry.register({
    id: 'other-brand',
    name: 'Other Brand',
    catalog: [{ id: 'other-brand/hero', label: 'Hero', templateKey: 'hero' }],
    render: (page, site) => '<main>' + page.title + ' from ' + site.brand + '</main>',
  });
  assert.equal(registry.getTheme('other-brand').name, 'Other Brand');
  assert.equal(registry.catalog['other-brand'][0].templateKey, 'hero');
  assert.equal(registry.render('other-brand', { title: 'Shop' }, { brand: 'Acme' }), '<main>Shop from Acme</main>');
  assert.equal(registry.getTheme('fnf'), null);
});
test('the portable registry contains no FNF domain/brand assets', () => {
  const core = read('packages/theme-contract/runtime/theme-preview-registry.js');
  assert.doesNotMatch(core, /fuelnfreetime|fandft|earned-hours|Fuel & Free Time|\.webp/);
});
test('non-active visual preview modes cannot publish the live Heuristic page', () => {
  const editor = read('apps/ecommerce-cms-agentsam/frontend/static/js/theme-editor.js');
  assert.match(editor, /if \(selectedTheme !== 'heuristic'\)/);
  assert.match(editor, /Publication is disabled until its renderer and rollback pass acceptance/);
});
