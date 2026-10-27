import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { validateCropBounds } from "../apps/ecommerce-cms-agentsam/packages/agentsam-workbench/src/media-asset-workbench.js";

test("crop bounds accept integer rectangles contained by source pixels", () => {
  assert.equal(validateCropBounds({ x: 0, y: 0, width: 1145, height: 1374 }, 1145, 1374), true);
  assert.equal(validateCropBounds({ x: 100, y: 200, width: 600, height: 900 }, 1145, 1374), true);
  for (const rect of [
    { x: -1, y: 0, width: 10, height: 10 },
    { x: 1.5, y: 0, width: 10, height: 10 },
    { x: 1140, y: 0, width: 10, height: 10 },
    { x: 0, y: 1374, width: 10, height: 10 },
    { x: 0, y: 0, width: 0, height: 10 },
    { x: 0, y: 0, width: 8192, height: 8192 },
  ]) assert.equal(validateCropBounds(rect, 1145, 1374), false, JSON.stringify(rect));
});

test("deployed and reusable media workbenches both expose real transform operations", () => {
  const paths = [
    "apps/ecommerce-cms-agentsam/packages/agentsam-workbench/src/media-asset-workbench.js",
    "packages/agentsam-workbench/src/media-asset-workbench.js",
  ];
  for (const path of paths) {
    const source = readFileSync(new URL("../" + path, import.meta.url), "utf8");
    assert.match(source, /data-media-tool="crop"/);
    assert.match(source, /data-editor-transform="rotate-left"/);
    assert.match(source, /data-editor-transform="flip-horizontal"/);
    assert.match(source, /form\.addEventListener\('submit'/);
    assert.match(source, /operations\.push\(\{ type: 'crop'/);
    assert.doesNotMatch(source, /\bform\.querySelector\('button'\)\.disabled/, "undefined form must not break save and comment");
  }
});

test("server accepts the bounded editing operation history as a source-linked PNG", () => {
  const source = readFileSync(new URL("../apps/ecommerce-cms-agentsam/backend/admin/media.js", import.meta.url), "utf8");
  assert.match(source, /"crop", "rotate", "flip", "undo"/);
  assert.match(source, /files\[0\]\.type \|\| ""\) !== "image\/png"/);
  assert.match(source, /const allowedRoles/);
});
