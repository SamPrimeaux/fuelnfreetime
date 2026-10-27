import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { blankGarmentImageSources } from "../apps/ecommerce-cms-agentsam/frontend/src/pages/products/studio-blank-image.ts";
import { selectStudioSideImage } from "../apps/ecommerce-cms-agentsam/frontend/src/pages/products/studio-side-image.ts";

const product = {
  name: "Test supplier long sleeve",
  cover_image_url: "https://supplier.example/covers/generic-black-shirt.png",
  main_icon_url: "https://supplier.example/covers/generic-black-shirt.png",
};

test("selected Ash Grey / S uses real grey supplier garment, not generic BLACK photo", () => {
  const ashGrey = {
    variant_title: "Ash Grey / S",
    realistic_image_url: "https://supplier.example/mockups/catalog/ash-grey/background.png",
    cover_image_url: product.cover_image_url,
    main_icon_url: product.main_icon_url,
  };
  const sources = blankGarmentImageSources(ashGrey, product);
  assert.deepEqual(sources, [ashGrey.realistic_image_url]);
  assert.equal(sources.includes(product.cover_image_url), false);
  assert.equal(selectStudioSideImage([], "front", "ash-s", null, sources[0], true), sources[0]);
});

test("selected Black and Royal Blue use their OWN photographic supplier background", () => {
  const black = {
    variant_title: "Black / S",
    realistic_image_url: "https://supplier.example/mockups/catalog/black/background.png",
    cover_image_url: "https://supplier.example/variants/black/cover.png",
  };
  const blue = {
    variant_title: "Royal Blue / 2XL",
    realistic_image_url: "https://supplier.example/mockups/catalog/royal-blue/background.png",
    cover_image_url: "https://supplier.example/variants/blue/cover.png",
  };
  assert.deepEqual(blankGarmentImageSources(black, product), [black.realistic_image_url]);
  assert.deepEqual(blankGarmentImageSources(blue, product), [blue.realistic_image_url]);
  assert.notEqual(blankGarmentImageSources(blue, product)[0], black.realistic_image_url);
});

test("unscoped supplier demonstration artwork and catalog gallery do not become editable garment", () => {
  const decorated = {
    variant_title: "Ash Grey / S",
    realistic_image_url: "https://supplier.example/wizard/bunnies-overrated-design.png",
    cover_image_url: product.cover_image_url,
    main_icon_url: product.main_icon_url,
  };
  assert.deepEqual(blankGarmentImageSources(decorated, product), []);
  assert.deepEqual(blankGarmentImageSources(null, product), []);
  assert.equal(selectStudioSideImage([], "back", "black-s", null,
    "https://supplier.example/mockups/catalog/black/background.png", false), null);
});

test("variant-specific fallback is allowed only when no provider blank photo exists", () => {
  const variant = {
    variant_title: "Black / S",
    cover_image_url: "https://supplier.example/variants/black/cover.png",
    main_icon_url: "https://supplier.example/variants/black/main.png",
  };
  assert.deepEqual(blankGarmentImageSources(variant, product), [
    variant.cover_image_url, variant.main_icon_url,
  ]);
  assert.deepEqual(blankGarmentImageSources({ variant_title: "Ash Grey / S", cover_image_url: product.cover_image_url }, product), []);
});

test("design canvas uses only selected variant candidates; never mockup gallery", async () => {
  const source = await readFile(
    new URL("../apps/ecommerce-cms-agentsam/frontend/src/pages/products/StudioWorkspace.tsx", import.meta.url), "utf8");
  assert.match(source, /blankGarmentImageSources\(variant, detail\.product\)/);
  assert.match(source, /\[\], locationId, variantId, location\?\.artboard_image_url/);
  assert.match(source, /sources=\{displayedRenderedUrl \? \[displayedRenderedUrl\] : designImageSources\}/);
  assert.match(source, /Your Completeful mockup/);
  assert.doesNotMatch(source, /variantImage\(variant\) \|\| baseImage/);
});
