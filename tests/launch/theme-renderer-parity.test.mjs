/**
 * RED launch gate: editor-advertised section instances must be renderable.
 * Home uses its own page composer (covered by another contract test).
 * If a future theme adapter does not rely on DOM markers, replace this
 * check with equivalent renderer-template registration proof.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { PAGE_REGISTRY } from "../../apps/ecommerce-cms-agentsam/backend/cms/registry.js";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../..");

for (const slug of ["shop","about","community","collaborate","policies","terms"]) {
  test(slug + " offers only storefront-renderable CMS section templates", () => {
    const html=readFileSync(path.join(root,"packages/heuristic-theme/storefront",slug+".html"),"utf8");
    const anchors = new Set([...html.matchAll(/data-cms-section=["']([^"']+)/g)].map(m=>m[1]));
    const offered = Object.keys(PAGE_REGISTRY[slug].sections);
    const unrenderable = offered.filter(templateKey => !anchors.has(templateKey));
    assert.deepEqual(
      unrenderable,
      [],
      "The editor advertises ["+unrenderable.join(", ")+"] on "+slug+
      " but the storefront has no corresponding section renderer/anchor."
    );
  });
}
