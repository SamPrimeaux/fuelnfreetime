import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { selectStudioSideImage } from "../apps/ecommerce-cms-agentsam/frontend/src/pages/products/studio-side-image.ts";

const source = async (relative) => readFile(new URL(relative, import.meta.url), "utf8");

test("studio canvas and mini preview use catalog image proxy/error-fallback renderer", async () => {
  const [canvas, image] = await Promise.all([
    source("../apps/ecommerce-cms-agentsam/frontend/src/pages/products/StudioWorkspace.tsx"),
    source("../apps/ecommerce-cms-agentsam/frontend/src/pages/products/ProductImage.tsx"),
  ]);
  assert.match(image, /\/catalog-image\?src=/, "existing catalog proxy preserved");
  assert.match(image, /onError=\{\(\) => \{/, "catalog renderer handles image load errors");
  assert.match(image, /setDirectAttempts/, "failed image proxies retry the actual public supplier URL");
  assert.match(image, /setFailed/, "exhausted source URLs advance to the next image");
  assert.match(image, /className=\{className\}/, "canvas can style a shared image");
  assert.match(canvas, /className=\{"ps-design-product-image" \+ \(hasProviderPlacementFrame/);
  assert.match(canvas, /sources=\{displayedRenderedUrl \? \[displayedRenderedUrl\] : designImageSources\}/);
  assert.match(canvas, /lazy=\{false\}/);
  assert.doesNotMatch(canvas, /<img className=\{"ps-design-product-image"/,
    "a raw supplier image URL may not bypass the same working catalog image proxy");
});

test("selected Front image can fall back by variant, but Back cannot fall back to Front", async () => {
  const canvas = await source("../apps/ecommerce-cms-agentsam/frontend/src/pages/products/StudioWorkspace.tsx");
  assert.match(canvas, /const placementBackground = selectStudioSideImage\(/);
  assert.match(canvas, /const exactSideCatalogReference = exactCatalogSideReference\(/);
  assert.match(canvas, /const designImage = sampleView \? exactSideCatalogReference : placementBackground/);
  assert.match(canvas, /blankVariantSources\[0\], isFrontLocation, selectedAttributes,/);
  assert.match(canvas, /: \[designImage\]\)/);
  const frontImage = "https://supplier.example/gildan-front.png";
  assert.equal(selectStudioSideImage([], "front", "black-s", "https://supplier.example/front-artboard.png",
    frontImage, true, { Color: "Black" }), frontImage);
  assert.equal(selectStudioSideImage([], "back", "black-s", "https://supplier.example/front-artboard.png",
    frontImage, false, { Color: "Black" }, false), null);
});
