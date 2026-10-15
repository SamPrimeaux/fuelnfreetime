/**
 * #NOTDONE: the two mini-agentsam.js copies should become one published package
 * (see docs/AGENTSAM_MERCH_AND_TOOLS_AUDIT_20261015.md F9). Until then this guard fails when a
 * feature lands in only one copy. It checks feature markers, not byte equality.
 */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const COPIES = {
  root: "../packages/agentsam-workbench/src/mini-agentsam.js",
  appLocal: "../apps/ecommerce-cms-agentsam/packages/agentsam-workbench/src/mini-agentsam.js",
};
const REQUIRED = [
  "reposition: position",
  "host.iconUrl",
  "zero-size anchor",
  "export function createCodePreview",
  "preferAbove",
  "positionBounds",
];

for (const [name, rel] of Object.entries(COPIES)) {
  test(`mini-agentsam (${name}) keeps the shared feature set`, async () => {
    const source = await readFile(new URL(rel, import.meta.url), "utf8");
    for (const marker of REQUIRED) assert.ok(source.includes(marker), `${name} copy is missing: ${marker}`);
  });
}
