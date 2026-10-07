import test from "node:test";
import assert from "node:assert/strict";
import {
  acceptGeneratedBlock,
  createTokenResolver,
  detectProvenance,
  nsForms,
  readNamespace,
  resolveUidToken,
  scanSections,
} from "../frontend/static/js/generation-namespace.mjs";

function block(id) {
  return {
    html: '<div data-agentsam-block="' + id + '" id="__UID__" class="__UID__"><__UID__-card></__UID__-card></div>',
    css: '[data-agentsam-block="' + id + '"] .__UID__ { padding: var(--__UID__-pad); }',
    js: '(function(){ if (!customElements.get("__UID__-card")) customElements.define("__UID__-card", class extends HTMLElement {}); })()',
  };
}

test("two generated blocks do not collide", () => {
  const a = nsForms("hero-a");
  const b = nsForms("hero-b");
  const left = resolveUidToken(".__UID__ #__UID__", "hero-a");
  const right = resolveUidToken(".__UID__ #__UID__", "hero-b");
  assert.notEqual(a.css, b.css);
  assert.notEqual(left, right);
  assert.equal(left.includes(right), false);
});

test("clone re-resolves the namespace from the new block id", () => {
  const canonical = ".__UID__ { color: var(--__UID__-ink); }";
  const original = resolveUidToken(canonical, "menu");
  const clone = resolveUidToken(canonical, "menu-copy");
  assert.match(original, /agentsam-gen-menu\b/);
  assert.match(clone, /agentsam-gen-menu-copy/);
  assert.notEqual(original, clone);
  assert.equal(canonical.includes("__UID__"), true);
});

test("token split across a chunk boundary resolves", () => {
  const resolver = createTokenResolver("menu");
  assert.equal(resolver.push("__UI") + resolver.push("D__"), "agentsam-gen-menu");
  assert.equal(resolver.flush(), "");
});

test("lint failure repairs once, then refuses to save", () => {
  let calls = 0;
  const result = acceptGeneratedBlock({
    html: "<div class=\"bare\"></div>",
    css: "header { color: red; }",
    js: "var leaked = 1; window.x = 1;",
  }, {
    blockId: "menu",
    repair(code) {
      calls += 1;
      return code;
    },
  });
  assert.equal(calls, 1);
  assert.equal(result.ok, false);
  assert.equal(result.saved, false);
  assert.ok(result.violations.length > 0);
});

test("detectProvenance separates agentsam, foreign-ai, and unknown", () => {
  assert.equal(detectProvenance(".agentsam-gen-menu"), "agentsam");
  assert.equal(detectProvenance(".ai_gen_hero"), "foreign-ai");
  assert.equal(detectProvenance(".hero"), "unknown");
  const report = scanSections([{ key: "hero", html: ".ai_gen_hero" }, { key: "plain" }]);
  assert.equal(report[0].rewrite, false);
  assert.equal(report[1].provenance, "unknown");
});

test("missing manifest override falls back to agentsam", () => {
  assert.equal(readNamespace({}), "agentsam");
  assert.equal(readNamespace({ generation: {} }), "agentsam");
  assert.equal(readNamespace({ generation: { namespace: "" } }), "agentsam");
  assert.equal(nsForms("menu", readNamespace({})).css, "agentsam-gen-menu");
  assert.equal(nsForms("menu", readNamespace({})).js, "agentsam_gen_menu");
});
