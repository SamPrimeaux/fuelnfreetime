import assert from "node:assert/strict";
import test from "node:test";
import { suggestPrintScale } from "../apps/ecommerce-cms-agentsam/frontend/src/pages/products/studio-print-fit.ts";

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
