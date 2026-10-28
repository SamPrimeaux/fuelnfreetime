import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { effectiveArtworkDpi } from "../packages/agentsam-merch/src/geometry.js";

const workspace = readFileSync(
  new URL("../apps/ecommerce-cms-agentsam/frontend/src/pages/products/StudioWorkspace.tsx", import.meta.url),
  "utf8",
);
const css = readFileSync(
  new URL("../apps/ecommerce-cms-agentsam/frontend/src/styles/product-studio.css", import.meta.url),
  "utf8",
);

test("81 PPI is computed from source pixels and physical placement, not canvas zoom", () => {
  const actual = effectiveArtworkDpi({
    sourceWidthPx: 1181, sourceHeightPx: 1331,
    printWidthIn: 14, printHeightIn: 16,
    placementWidthPercent: 104,
  });
  assert.equal(actual.dpi, 81);
  assert.equal(actual.printedWidthIn, 14.56);
});

test("unverified studio PPI goal does not prevent preparing an editable draft", () => {
  assert.match(workspace, /const guidelineOnly = !hasDeclaredSupplierPpi &&[\s\S]*?blockingIssues\.every\(\(issue\) => issue\.code === "insufficient_resolution"\)/);
  assert.match(workspace, /manufacturingPreflight\.status\) && !guidelineOnly/);
  assert.match(workspace, /Draft saved\. Artwork is below the studio quality goal; supplier print approval is not verified/);
  assert.match(workspace, /source: \{ kind: "catalog-artboard", verified: false \}/);
});

test("mobile canvas has distinct design side and view selectors", () => {
  assert.match(workspace, /className="ps-print-side-toggle"/);
  assert.match(workspace, /className="ps-mobile-view-picker"/);
  assert.match(workspace, /aria-label="Canvas display mode"/);
  assert.match(workspace, /<option value="map">Print map<\/option>/);
  assert.match(workspace, /<option value="photo">Product photo<\/option>/);
  assert.match(css, /\.product-studio-shell \.ps-stage-toolbar \.ps-artboard-mode\{display:none\}/);
  assert.match(css, /\.product-studio-shell \.ps-mobile-view-picker\{/);
});

test("artwork selection preserves mobile viewport instead of scrolling header under navigation", () => {
  assert.doesNotMatch(workspace, /stage\.current\?\.scrollIntoView/);
  assert.match(workspace, /setFilmstripOpen\(false\);/);
});

test("quality inspector does not imply resizing recovers source detail", () => {
  assert.match(workspace, /PPI · Review/);
  assert.match(workspace, /Resampling pixels won't recover missing detail/);
  assert.match(workspace, /Inspect \/ edit artwork/);
});
