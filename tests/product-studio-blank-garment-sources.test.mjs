import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { blankGarmentImageSources } from "../apps/ecommerce-cms-agentsam/frontend/src/pages/products/studio-blank-image.ts";
import { selectStudioSideImage } from "../apps/ecommerce-cms-agentsam/frontend/src/pages/products/studio-side-image.ts";

test("the editing canvas never layers merchant art on a provider's decorated example mockup", () => {
  const product = {
    name: "Gildan 2400",
    realistic_image_url: "https://provider.example/mockups/old-brand/background.png",
    cover_image_url: "https://provider.example/default-ash-grey-cover.png",
  };
  const ash = {
    variant_title: "Ash Grey / S",
    cover_image_url: "https://provider.example/ash-grey-blank-cover.png",
    main_icon_url: "https://provider.example/ash-grey-icon.png",
    realistic_image_url: "https://provider.example/bunnies-overrated-design.png",
  };
  const sources = blankGarmentImageSources(ash, product);
  assert.deepEqual(sources, [
    "https://provider.example/ash-grey-blank-cover.png",
    "https://provider.example/ash-grey-icon.png",
  ]);
  assert.equal(sources.includes(ash.realistic_image_url), false);
  assert.equal(sources.includes(product.realistic_image_url), false);
  assert.equal(selectStudioSideImage([], "front", "ash-s", null, sources[0], true), sources[0]);
});

test("broken variant images never fall back to a DIFFERENT shirt color", () => {
  const black = { variant_title: "Black / S", realistic_image_url: "https://provider.example/decorated-black.png" };
  const product = { cover_image_url: "https://provider.example/ash-grey-default.png" };
  assert.deepEqual(blankGarmentImageSources(black, product), []);
  assert.deepEqual(blankGarmentImageSources(null, product), ["https://provider.example/ash-grey-default.png"]);
});

test("the canvas does not use generic decorated mockup gallery or realistic variant image", async () => {
  const source = await readFile(
    new URL("../apps/ecommerce-cms-agentsam/frontend/src/pages/products/StudioWorkspace.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /blankGarmentImageSources\(variant, detail\.product\)/);
  assert.match(source, /\[\], locationId, variantId, location\?\.artboard_image_url/);
  assert.doesNotMatch(source, /variantImage\(variant\) \|\| baseImage/);
  assert.match(source, /sources=\{designImageSources\}/);
});
