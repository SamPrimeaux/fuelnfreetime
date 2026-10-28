import test from "node:test";
import assert from "node:assert/strict";
import { assortmentSearchTerms, normalizeCollectionRules, resolveCollectionMembers, resolveAssortmentCandidates } from "../packages/agentsam-merch/src/collection-planning.js";

test("portable assortment recipes resolve usable manufacturer-search terms", () => {
  assert.deepEqual(assortmentSearchTerms("tees"), ["Comfort Colors 1717", "unisex t-shirt", "long sleeve"]);
  assert.deepEqual(assortmentSearchTerms("accessories"), ["Metal Wallet", "Flask", "Keychain"]);
  assert.deepEqual(assortmentSearchTerms("drinkware"), ["tumbler", "Coffee Mug", "Glass"]);
  assert.throws(() => assortmentSearchTerms("fictional"));
});
test("automatic and hybrid collection membership evaluate actual catalog rows without false matches", () => {
  const catalog = [
    {id:1,title:"Fuel N Free Time Tee",slug:"fuel-tee",collection:"Essentials"},
    {id:2,title:"Weekend Cap",slug:"cap",collection:"Accessories"},
    {id:3,title:"Fuel Heavyweight Tee",slug:"fuel-heavy",collection:"Essentials"},
  ];
  const rules = {mode:"automatic",match:"all",conditions:[{field:"title",operator:"contains",value:"tee"}],excludedIds:[3]};
  assert.deepEqual(resolveCollectionMembers(catalog,[2],rules),[1]);
  assert.deepEqual(resolveCollectionMembers(catalog,[2],{...rules,mode:"hybrid"}),[2,1]);
  assert.deepEqual(resolveCollectionMembers(catalog,[2],{mode:"manual"}),[2]);
});
test("unsafe or unbounded collection rules fail validation", () => {
  assert.throws(()=>normalizeCollectionRules({mode:"automatic",conditions:[]}));
  assert.throws(()=>normalizeCollectionRules({mode:"automatic",conditions:[{field:"sku",operator:"contains",value:"x"}]}));
  assert.throws(()=>normalizeCollectionRules({mode:"hybrid",conditions:[{field:"title",operator:"contains",value:""}]}));
});

test("available supplier pack slots produce real candidate IDs and show missing suppliers", () => {
  const live = {
    "heavyweight-tee": [{ completeful_product_id:"comfort-colors-1717", name:"Comfort Colors 1717", available:1, variant_count:36, print_location_count:2, mockup_count:12 }],
    "classic-tee": [{ completeful_product_id:"hidden", available:0, variant_count:50 },
      { completeful_product_id:"gildan-5000", available:1, variant_count:90, print_location_count:2, mockup_count:38 }],
    "long-sleeve": [{ completeful_product_id:"not-sellable", available:1, variant_count:0, mockup_count:4 }],
  };
  const actual = resolveAssortmentCandidates("tees",live);
  assert.deepEqual(actual.recommended_ids, ["comfort-colors-1717","gildan-5000"]);
  assert.deepEqual(actual.missing_slots, ["long-sleeve"]);
  assert.equal(actual.slots[0].recommended.name, "Comfort Colors 1717");
  assert.equal(actual.slots[2].recommended, null);
});
test("packs never invent a category or duplicate supplier IDs across slots", () => {
  const same = [{ catalog_product_id:"product-one", available:1,variant_count:2,print_location_count:1 }];
  const out = resolveAssortmentCandidates("accessories",
    {wallet:same, flask:same, keychain:same});
  assert.deepEqual(out.recommended_ids, ["product-one"]);
  assert.deepEqual(out.missing_slots, ["flask","keychain"]);
});
