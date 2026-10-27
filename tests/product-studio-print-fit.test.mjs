import assert from "node:assert/strict";
import test from "node:test";
import { suggestPrintScale, printSourceRecommendation } from "../apps/ecommerce-cms-agentsam/frontend/src/pages/products/studio-print-fit.ts";

test("280 PPI logo auto-fits into a 300 PPI print target without synthetic upscaling", () => {
  const result = suggestPrintScale({ currentScale: 80, effectivePpi: 280, targetPpi: 300 });
  assert.ok(result != null && result > 74 && result < 75);
  assert.ok(280 * 80 / result >= 300);
});

test("a severe low-resolution source requires a replacement rather than tiny automatic sizing", () => {
  assert.equal(suggestPrintScale({ currentScale: 80, effectivePpi: 96, targetPpi: 300 }), null);
});

test("a ready source is not adjusted; missing provider data cannot be guessed", () => {
  assert.equal(suggestPrintScale({ currentScale: 80, effectivePpi: 300, targetPpi: 300 }), null);
  assert.equal(suggestPrintScale({ currentScale: 80, effectivePpi: null, targetPpi: 300 }), null);
  assert.equal(suggestPrintScale({ currentScale: 80, effectivePpi: 280, targetPpi: null }), null);
});

test("declared placement lower bound is honored", () => {
  assert.equal(suggestPrintScale({ currentScale: 6, effectivePpi: 280, targetPpi: 300, minimumScale: 6 }), null);
});


test("low resolution reports required original pixels and labels app target separately from supplier", () => {
  const plan = printSourceRecommendation({
    currentPpi: 86, targetPpi: 300, providerPpi: null,
    printedWidthIn: 14, printedHeightIn: 16,
    sourceWidthPx: 1204, sourceHeightPx: 1376,
  });
  assert.equal(plan?.source, "studio_guideline");
  assert.equal(plan?.needsSharperSource, true);
  assert.equal(plan?.requiredWidthPx, 4200);
  assert.equal(plan?.requiredHeightPx, 4800);
  assert.equal(plan?.pixelDensityMultiplier, 3.5);
});

test("supplier DPI is only declared when provider actually supplies one", () => {
  const plan = printSourceRecommendation({
    currentPpi: 150, targetPpi: 200, providerPpi: 200,
    printedWidthIn: 4, printedHeightIn: 4,
    sourceWidthPx: 600, sourceHeightPx: 600,
  });
  assert.equal(plan?.source, "provider");
  assert.equal(plan?.requiredWidthPx, 800);
  assert.equal(plan?.pixelDensityMultiplier, 1.3);
  assert.equal(printSourceRecommendation({
    currentPpi: null, targetPpi: 300, providerPpi: null,
    printedWidthIn: 14, printedHeightIn: 16,
    sourceWidthPx: null, sourceHeightPx: 1024,
  }), null);
});
