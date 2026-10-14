import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { projectSelectedSupplierVariants, readProductSupplierSelection } from "../apps/ecommerce-cms-agentsam/backend/admin/product-selling-selection.js";

const sizes = ["S", "M", "L", "XL", "2XL", "3XL"];
const colors = ["Ash", "Black", "Charcoal", "Forest", "Navy", "White", "Sand", "Red", "Blue", "Moss", "Grey", "Gold", "Pink", "Royal", "Olive"];
const catalog = colors.flatMap(color => sizes.map(size => ({
  catalog_variant_id: color + "-" + size,
  completeful_variant_id: color + "-" + size,
  provider_sku: "HOOD." + color + "." + size,
  variant_attributes_json: JSON.stringify({ Color: color, Size: size }),
  attributes_json: null,
}));

test("Product Details projects all 90 saved supplier variants without creating local variants", async () => {
  const calls = [];
  const env = { DB: { prepare(sql) {
    calls.push(sql);
    return { bind(...params) {
      assert.equal(params.length, 2);
      assert.equal(params[1], "hoodie-18500");
      const chosen = JSON.parse(params[0]);
      return { all: async () => ({ results: catalog.filter(v => chosen.includes(v.catalog_variant_id)) }) };
    } };
  } } };
  const draft = {
    completeful_catalog_product_id: "hoodie-18500",
    selected_variant_ids_json: JSON.stringify(catalog.map(v => v.catalog_variant_id)),
  };
  const selection = await readProductSupplierSelection(env, draft);
  assert.equal(selection.selected_count, 90);
  assert.equal(selection.resolved_count, 90);
  assert.equal(selection.unavailable_count, 0);
  assert.equal(selection.sizes.length, 6);
  assert.equal(selection.colors.length, 15);
  assert.equal(selection.variants[0].color, "Ash");
  assert.equal(selection.variants[0].size, "S");
  assert.equal(selection.variants.at(-1).provider_sku, "HOOD.Olive.3XL");
  assert.ok(calls[0].includes("json_each"));
  assert.ok(calls[0].includes("LEFT JOIN completeful_catalog_variants"));
  assert.equal(calls.some(sql => /INSERT INTO product_variants/i.test(sql)), false);
});

test("missing or cross-product supplier variants are shown as unresolved, not fabricated", () => {
  const projected = projectSelectedSupplierVariants([
    catalog[0],
    { catalog_variant_id: "missing", completeful_variant_id: null, provider_sku: null, attributes_json: null },
  ]);
  assert.equal(projected.selected_count, 2);
  assert.equal(projected.resolved_count, 1);
  assert.equal(projected.unavailable_count, 1);
  assert.equal(projected.variants[1].provider_sku, null);
  assert.equal(projected.variants[1].resolved, false);
});

test("legacy Product Details uses persisted selection, not an empty local variant form", () => {
  const html = readFileSync("apps/ecommerce-cms-agentsam/frontend/static/product-edit.html", "utf8");
  const api = readFileSync("apps/ecommerce-cms-agentsam/backend/admin/api.js", "utf8");
  assert.match(html, /renderVariants\(d\.variants, Boolean\(d\.design_draft\?\.completeful_catalog_product_id\), d\.selling_selection\)/);
  assert.match(html, /renderSupplierSelection\(selectionRoot, sellingSelection\)/);
  assert.match(html, /No manual SKU entry required/);
  assert.match(html, /Keep this product as Draft until Completeful creates and maps/);
  assert.match(api, /selling_selection: sellingSelection/);
});
