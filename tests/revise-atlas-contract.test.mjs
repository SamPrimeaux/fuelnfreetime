import assert from "node:assert/strict";
import test from "node:test";
import { reviseAtlas } from "../packages/theme-contract/runtime/revise-atlas-source.js";
import "../packages/theme-contract/runtime/portable-sections.js";

const portable = globalThis.ThemePortableSections;
globalThis.ThemeReviseAtlas = reviseAtlas;

test("24 shipped semantic Revise renderers are real, independently editable sections", () => {
  assert.equal(reviseAtlas.definitions.length, 24);
  assert.equal(new Set(reviseAtlas.definitions.map((d) => d.sourcePreset)).size, 24);
  assert.equal(portable.catalog().filter((d) => d.id.startsWith("revise-atlas/")).length, 24);
  for (const definition of reviseAtlas.definitions) {
    assert.ok(portable.get(definition.id));
    const content = portable.defaults(definition.id);
    assert.equal(content.__editor.sourceContract, "revise/site-section-v1");
    assert.deepEqual(portable.validate(definition.id, content), { ok: true }, definition.id);
    const markup = portable.render({ key: "atlas-" + definition.id.split("/")[1], content });
    assert.match(markup, /class="ps-section ps-revise-atlas"/);
    assert.match(markup, /data-site-preset="revise\//);
    assert.match(markup, /data-section="/);
    assert.ok(markup.length > 180, definition.id);
  }
});

test("donor layouts stay renderer-backed and merchant content survives theme movement", () => {
  const content = portable.defaults("revise-atlas/before-after");
  content.heading = "The rebuild, in progress";
  const before = structuredClone(content);
  const markup = portable.render({ key: "campaign-3", content });
  assert.match(markup, /The rebuild, in progress/);
  assert.deepEqual(content, before);
  const malicious = structuredClone(content);
  malicious.heading = '<img src=x onerror="alert(1)">';
  assert.doesNotMatch(portable.render({ key: "campaign-3", content: malicious }), /<img src=x onerror=/);
  assert.match(portable.render({ key: "campaign-3", content: malicious }), /&lt;img/);
});

test("Revise donor CTA paths are validated and sanitized at render boundary", () => {
  const content = portable.defaults("revise-atlas/sticky-curtain");
  content.primaryAction = { label: "Shop", href: "javascript:alert(1)" };
  assert.equal(portable.validate("revise-atlas/sticky-curtain", content).ok, false);
  assert.doesNotMatch(portable.render({ key: "hero", content }), /href="javascript:/);
});

test("repeatable source items remain merchant blocks, not a fixed group of card1 aliases", () => {
  const content = portable.defaults("revise-atlas/wardrobe-rail");
  assert.ok(content.__editor.blocks.length >= 3);
  const key = content.__editor.blocks[0].id;
  content[key].title = "Customer-owned garment";
  assert.match(portable.render({ key: "wardrobe", content }), /Customer-owned garment/);
  assert.deepEqual(portable.validate("revise-atlas/wardrobe-rail", content), { ok: true });
});
