import test from "node:test";
import assert from "node:assert/strict";
import {
  buildProductOptions, resolveSelectedVariant, sizeHasVariant, variantIsLocallyAvailable,
} from "../packages/heuristic-theme/storefront/js/product-options.mjs";

const palette = ["Ash", "Black", "Bone", "Charcoal", "Forest", "Navy", "Moss", "Clay",
  "Sand", "Stone", "Slate", "Wine", "Olive", "Steel", "Heather"];
const sizeList = ["2XL", "3XL", "L", "M", "S", "XL"];
const variants = palette.flatMap((color, ci) => sizeList.map((size, si) => ({
  id: ci * 6 + si + 1, sku: `TEST.${ci}.${si}`, color, size, price_cents: 3999,
  inventory_qty: 0,
})));

test("90 supplier combinations become 15 colors and 6 unique sizes", () => {
  const model = buildProductOptions(variants);
  assert.equal(model.count, 90);
  assert.equal(model.colors.length, 15);
  assert.deepEqual(model.sizes, ["S", "M", "L", "XL", "2XL", "3XL"]);
});

test("color+size maps to exactly one stable local variant ID", () => {
  const match = resolveSelectedVariant(variants, { color: "black", size: "xl" });
  assert.equal(match.id, 12);
  assert.equal(match.sku, "TEST.1.5");
  assert.equal(resolveSelectedVariant(variants, { color: "unknown", size: "XL" }), null);
  assert.equal(sizeHasVariant(variants, "Black", "XL"), true);
  assert.equal(sizeHasVariant(variants, "Black", "One Size"), false);
});

test("missing options are disabled without losing unrelated valid selections", () => {
  const reduced = variants.filter((row) => row.color !== "Ash" || row.size !== "XL");
  assert.equal(sizeHasVariant(reduced, "Ash", "XL"), false);
  assert.equal(sizeHasVariant(reduced, "Black", "XL"), true);
});

test("zero supplier stock is not transformed into fake local inventory", () => {
  assert.ok(variants.every((row) => !variantIsLocallyAvailable(row)));
  assert.equal(variantIsLocallyAvailable({ inventory_qty: 2 }), true);
  assert.equal(variantIsLocallyAvailable(null), false);
});
