import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "../packages/theme-contract/runtime/portable-sections.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runtime = globalThis.ThemePortableSections;
const stylesheet = fs.readFileSync(
  path.join(root, "packages/theme-contract/runtime/portable-sections.css"), "utf8"
);
const text = (name) => fs.readFileSync(path.join(root, name), "utf8");

test("the merchant catalog exposes only real portable section renderers", () => {
  assert.equal(runtime.definitions.length, 12);
  for (const def of runtime.definitions) {
    assert.equal(runtime.catalog().some(entry => entry.id === def.id), true);
    assert.ok(runtime.schema(def.id)?.fields?.length > 0);
    assert.ok(stylesheet.includes('data-portable-preset="' + def.id + '"'),
      "Missing real portable style implementation: " + def.id);
    const content = runtime.defaults(def.id);
    assert.equal(content.__editor.themePreset, def.id);
    assert.equal(content.__editor.templateKey, "portable");
    assert.deepEqual(runtime.validate(def.id, content), { ok: true });
    const key = "portable-001";
    const markup = runtime.render({ key, content });
    assert.ok(markup.includes('data-cms-section="' + key + '"'));
    assert.ok(markup.includes('data-portable-preset="' + def.id + '"'));
    assert.ok(markup.includes('class="ps-section '), "Each preset requires a real renderer");
  }
});

test("one instance can move across themes without copying its merchant content", () => {
  const content = runtime.defaults("revise/wardrobe-rail");
  content.card1.name = "User 123 collection";
  content.title = "Special collection";
  const stored = JSON.parse(JSON.stringify(content));
  const entry = { key: "collections-001", content: stored, sort_order: 10 };
  const markup = runtime.render(entry);
  assert.match(markup, /User 123 collection/);
  assert.match(markup, /Special collection/);
  assert.equal(runtime.render(entry), markup);
  assert.deepEqual(stored, content, "Rendering must never mutate the merchant's saved CMS content");
  assert.equal(runtime.get("revise/wardrobe-rail").source, "revise");
  assert.equal(runtime.get("fnf/collection-list").source, "fnf");
  assert.notEqual(
    runtime.render({ key: "c", content: { ...content, __editor: { ...content.__editor, themePreset: "fnf/collection-list" } } }),
    markup,
    "Variants must produce a genuinely distinct, style-scoped section identity"
  );
});

test("repeatable blocks remain valid when an actual merchant adds non-card-number IDs", () => {
  const content = runtime.defaults("fnf/feature-card-grid");
  content.__editor.blocks.push({ id: "feature-a91bc2", templateKey: "detail-card", enabled: true });
  content["feature-a91bc2"] = { name: "Lifetime support", description: "A benefit with real content." };
  assert.deepEqual(runtime.validate("fnf/feature-card-grid", content), { ok: true });
  const markup = runtime.render({ key: "feature-1", content });
  assert.match(markup, /Lifetime support/);
  assert.match(markup, /data-cms-block="feature-a91bc2"/);
});

test("unsafe links, unknown fields and HTML do not reach the renderer unescaped", () => {
  const content = runtime.defaults("revise/sticky-curtain");
  content.headline = '<img src=x onerror="alert(1)">';
  content.ctaPrimary.href = "javascript:alert(1)";
  assert.equal(runtime.validate("revise/sticky-curtain", content).ok, false);
  const markup = runtime.render({ key: "test", content });
  assert.doesNotMatch(markup, /<img src=x onerror=/);
  assert.doesNotMatch(markup, /href="javascript:/);
  assert.match(markup, /&lt;img/);
  content.ctaPrimary.href = "/shop";
  content.malicious = "test";
  assert.equal(runtime.validate("revise/sticky-curtain", content).ok, false);
});

test("repeatable section styling is scoped and does not overwrite the storefront theme", () => {
  assert.doesNotMatch(stylesheet, /(^|\n)\s*(?:body|html)\s*\{/);
  assert.match(stylesheet, /\[data-portable-preset\^="revise\/"\]/);
  assert.match(stylesheet, /\[data-portable-preset\^="fnf\/"\]/);
  assert.match(stylesheet, /prefers-reduced-motion/);
});

test("CMS and Theme Studio consume exactly this real renderer from build artifacts", () => {
  const assembly = text("scripts/sync-app-frontend.mjs");
  assert.match(assembly, /portable-sections\.\$\{ext\}/);
  assert.match(assembly, /js\/portable-sections\.\$\{ext\}/);
  const editor = text("apps/ecommerce-cms-agentsam/frontend/static/js/theme-editor.js");
  assert.match(editor, /window\.ThemePortableSections\?\.catalog/);
  assert.match(editor, /window\.ThemePortableSections\?\.schema/);
  const cms = text("packages/heuristic-theme/storefront/js/cms-hydrate.js");
  assert.match(cms, /mountPortableSections/);
  assert.match(cms, /runtime\.render\(entry\)/);
  const home = text("packages/heuristic-theme/storefront/js/page-composer.js");
  assert.match(home, /globalThis\.ThemePortableSections\.render/);
  const preview = text("packages/fnf-theme/src/editor/preview-adapter.js");
  assert.match(preview, /window\.ThemePortableSections\?\.render/);
  const backend = text("apps/ecommerce-cms-agentsam/backend/cms/api.js");
  assert.match(backend, /PORTABLE\.validate/);
  assert.match(backend, /PORTABLE\.defaults/);
  assert.doesNotMatch(backend, /store_theme_pages|store_themes/);
});
