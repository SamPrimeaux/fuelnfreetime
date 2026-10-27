import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { blankGarmentImageSources } from "../apps/ecommerce-cms-agentsam/frontend/src/pages/products/studio-blank-image.ts";
import {
  approvedBlankView, exactCatalogBlankCandidate, exactCatalogSideReference, selectStudioSideImage,
  unscopedCatalogSideReference,
} from "../apps/ecommerce-cms-agentsam/frontend/src/pages/products/studio-side-image.ts";

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

test("variant-specific marketing covers are references, not editable blanks", () => {
  const variant = {
    variant_title: "Black / S",
    cover_image_url: "https://supplier.example/variants/black/cover.png",
    main_icon_url: "https://supplier.example/variants/black/main.png",
  };
  assert.deepEqual(blankGarmentImageSources(variant, product), []);
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

test("provider back background is scoped to the exact color and print location", () => {
  const product = "47d3afff-3e4c-492a-8e8b-2dcfca38caa1";
  const preview = `https://jvkydnvdajcfnqysmuwt.supabase.co/storage/v1/object/public/product-images/mockups/${product}/cd2ac198-80d2-4bfc-a584-c5ff8a501c28/preview.png`;
  const mockups = [
    { preview_url: preview, active: 1, print_location_id: "back", variant_scope_json: '{"Color":"Black"}' },
    { preview_url: preview.replace("cd2ac198-80d2-4bfc-a584-c5ff8a501c28", "b32fef77-1ea2-4711-8b8d-71f9c61ef354"),
      active: 1, print_location_id: "front", variant_scope_json: '{"Color":"Black"}' },
  ];
  assert.equal(exactCatalogBlankCandidate(mockups, "back", "variant-black-s", {Color:"Black"}),
    preview.replace("/preview.png", "/background.png"));
  assert.equal(exactCatalogBlankCandidate(mockups, "front", "variant-black-s", {Color:"Black"}),
    mockups[1].preview_url.replace("/preview.png", "/background.png"));
  assert.equal(exactCatalogBlankCandidate(mockups, "back", "variant-moss-s", {Color:"Moss"}), null);
  assert.equal(exactCatalogSideReference(mockups, "back", "variant-moss-s", {Color:"Moss"}), null);
  assert.equal(exactCatalogBlankCandidate([{...mockups[0],variant_scope_json: null}], "back", "variant-black-s", {Color:"Black"}), null);
  assert.equal(exactCatalogBlankCandidate([{...mockups[0],preview_url: "https://external.example/mockups/aa/bb/preview.png"}],
    "back", "variant-black-s", {Color:"Black"}), null);
});

test("approved media mappings are exact product-color-side entries; no cross-color fallback", () => {
  const entries = [
    {color_key:"black",side_key:"back",image_url:"/media/approved/1717-black-back.webp"},
    {color_key:"ivory",side_key:"front",image_url:"/media/approved/1717-ivory-front.webp"},
  ];
  assert.equal(approvedBlankView(entries," Black ","BACK"),entries[0].image_url);
  assert.equal(approvedBlankView(entries,"Black","front"),null);
  assert.equal(approvedBlankView(entries,"Ivory","back"),null);
  assert.equal(approvedBlankView(entries,"Brick","back"),null);
  assert.equal(approvedBlankView([], "Black","back"),null);
});

test("blank view selection does not overwrite source artwork or merge physical sides", async () => {
  const source = await readFile(new URL("../apps/ecommerce-cms-agentsam/frontend/src/pages/products/StudioWorkspace.tsx",import.meta.url),"utf8");
  assert.match(source, /exactCatalogBlankCandidate/);
  assert.match(source, /approvedBlankView/);
  assert.match(source, /onResolvedSource=/);
  assert.match(source, /Merchant-reviewed clean garment photo from Media Library/);
  assert.match(source, /Selecting will not replace your print artwork/);
});

test("unscoped supplier back photos are references, never promoted to blank candidates", () => {
  const preview = "https://jvkydnvdajcfnqysmuwt.supabase.co/storage/v1/object/public/product-images/mockups/a/b/preview.png";
  const mockups = [{ active:1, print_location_id:"back", preview_url: preview, variant_scope_json:null }];
  assert.equal(unscopedCatalogSideReference(mockups,"back"),preview);
  assert.equal(unscopedCatalogSideReference(mockups,"front"),null);
  assert.equal(exactCatalogBlankCandidate(mockups,"back","variant-id",{Color:"Ivory"}),null);
});
