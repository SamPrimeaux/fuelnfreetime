import assert from "node:assert/strict";
import test from "node:test";
import {
  orderedVariantIds,
  updateSellingVariants,
  toggleSellingGroup,
} from "../apps/ecommerce-cms-agentsam/frontend/src/pages/products/studio-selling-variants.ts";

const colors = ["Black", "Ash", "Charcoal", "Forest", "Navy", "Royal", "White"];
const sizes = ["S", "M", "L", "XL", "2XL", "3XL"];
const catalog = colors.flatMap((color) => sizes.map((size) => color + "/" + size));

test("42 real provider tuples persist independently from one preview variant", () => {
  const previewId = "Black/M";
  const selected = orderedVariantIds(catalog, catalog);
  assert.equal(selected.length, 42);
  assert.equal(previewId, "Black/M");
  assert.ok(selected.includes("White/3XL"));
});

test("size group selection works across colors without generating combinations", () => {
  const all = orderedVariantIds(catalog, catalog);
  const sizeM = catalog.filter((id) => id.endsWith("/M"));
  const withoutM = toggleSellingGroup(catalog, all, sizeM);
  assert.equal(withoutM.length, 35);
  assert.ok(!withoutM.includes("Black/M"));
  assert.ok(withoutM.includes("Black/L"));
  assert.deepEqual(toggleSellingGroup(catalog, withoutM, sizeM), all);
});

test("one individually excluded combination survives catalog ordering", () => {
  const all = orderedVariantIds(catalog, catalog);
  const selected = updateSellingVariants(catalog, all, ["Black/M"], false);
  assert.equal(selected.length, 41);
  assert.ok(selected.includes("Black/S"));
  assert.ok(!selected.includes("Black/M"));
  assert.deepEqual(orderedVariantIds(catalog, selected), selected);
});

test("invalid variant IDs cannot enter selection and clearing remains explicit", () => {
  const included = updateSellingVariants(catalog, [], ["Fake/5XL", "Navy/XL"], true);
  assert.deepEqual(included, ["Navy/XL"]);
  assert.deepEqual(updateSellingVariants(catalog, included, ["Navy/XL"], false), []);
  assert.deepEqual(toggleSellingGroup(catalog, included, []), included);
});

test("sparse provider combinations are not synthesized by group toggles", () => {
  const sparse = ["Black/S", "Black/M", "Ash/M"];
  const selected = toggleSellingGroup(sparse, [], ["Black/S", "Black/M"]);
  assert.deepEqual(selected, ["Black/S", "Black/M"]);
  assert.ok(!selected.includes("Ash/S"));
});
