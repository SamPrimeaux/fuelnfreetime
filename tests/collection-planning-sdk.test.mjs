import test from "node:test";
import assert from "node:assert/strict";
import { assortmentSearchTerms, normalizeCollectionRules, resolveCollectionMembers } from "../packages/agentsam-merch/src/collection-planning.js";

test("portable assortment recipes resolve usable manufacturer-search terms", () => {
  assert.deepEqual(assortmentSearchTerms("tees"), ["Comfort Colors 1717", "unisex t-shirt", "long sleeve"]);
  assert.deepEqual(assortmentSearchTerms("accessories"), ["trucker hat", "tumbler", "sticker"]);
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
