import assert from "node:assert/strict";
import test from "node:test";
import { fabricColorFromImagePixels, validProviderFabricHex } from "../apps/ecommerce-cms-agentsam/frontend/src/pages/products/studio-fabric-color.ts";
import { selectStudioSideImage } from "../apps/ecommerce-cms-agentsam/frontend/src/pages/products/studio-side-image.ts";

function makeSample(hex) {
  const w = 24, h = 24, pixels = new Uint8ClampedArray(w * h * 4);
  const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    const shirt = x >= 8 && x < 16 && y >= 7 && y < 19;
    pixels.set(shirt ? [...rgb, 255] : [248, 248, 248, 255], i);
  }
  return fabricColorFromImagePixels(pixels, w, h);
}

test("back side never uses the shared black artboard for the selected brick or denim variant", () => {
  const unscopedBlack = [{ print_location_id: "back", preview_url: "https://example.test/black.png", active: 1 }];
  assert.equal(selectStudioSideImage(unscopedBlack, "back", "brick-variant", "https://example.test/black-artboard.png", "https://example.test/brick-front.png", false), null);
  assert.equal(selectStudioSideImage(unscopedBlack, "back", "denim-variant", "https://example.test/black-artboard.png", "https://example.test/denim-front.png", false), null);
  assert.equal(selectStudioSideImage(unscopedBlack, "front", "brick-variant", null, "https://example.test/brick-front.png", true), "https://example.test/brick-front.png");
  const exactBack = [{ print_location_id: "back", preview_url: "https://example.test/brick-back.png", variant_scope_json: '["brick-variant"]', active: 1 }];
  assert.equal(selectStudioSideImage(exactBack, "back", "brick-variant", null, null, false), "https://example.test/brick-back.png");
});

test("fabric color is sampled from variant-specific photo rather than hardcoded color names", () => {
  assert.equal(makeSample("#91525a"), "#91525a");
  assert.equal(makeSample("#506476"), "#506476");
  assert.equal(makeSample("#58654f"), "#58654f");
  assert.equal(fabricColorFromImagePixels(new Uint8ClampedArray(4), 24, 24), null);
  assert.equal(validProviderFabricHex(" #f09 "), "#ff0099");
  assert.equal(validProviderFabricHex("Moss"), null);
});
