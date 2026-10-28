import test from "node:test";
import assert from "node:assert/strict";
import { readCatalogQuery,writeCatalogQuery,filterCatalogRows,catalogActiveFilterCount } from "../packages/agentsam-merch/src/catalog-query.js";
const rows=[
 {name:"Leather Wrapped Flask",print_type:"ENGRAVING",tags_json:'["groomsmen gift","barware"]',local_group:"accessories",available:1,fulfillment_cost_free_cents:700,mockup_count:18,priority:2},
 {name:"16oz Pint Glass",print_type:"UV",tags_json:'["groomsmen gift","barware","wedding favor"]',available:1,fulfillment_cost_free_cents:550,mockup_count:9},
 {name:"Cotton Crewneck Sweatshirt",print_type:"DTG",tags_json:"[]",available:1,fulfillment_cost_free_cents:1300,mockup_count:0},
 {name:"Skinny Tumbler",print_type:"UV,ETCHING",tags_json:'["drinkware","christmas gift"]',available:1,fulfillment_cost_free_cents:1050,mockup_count:20}
];
test("URL state is stable, typed, and drops unrecognized filter values",()=>{
 const url=new URLSearchParams("category=drinkware,barware,nonexistent&print=uv,etching&occasion=groomsmen-gift&sort=price-low&has_mockups=1&q=tumbler&page=3");
 const q=readCatalogQuery(url);
 assert.deepEqual(q.category,["drinkware","barware"]);
 assert.deepEqual(q.printType,["uv","etching"]);
 assert.equal(q.page,3); assert.equal(q.hasMockups,true);
 assert.deepEqual(readCatalogQuery(writeCatalogQuery(q)),q);
 assert.equal(catalogActiveFilterCount(q),8);
});
test("within-group OR and between-group AND with provider-native tags",()=>{
 const q=readCatalogQuery("category=barware,drinkware&print=uv&occasion=groomsmen-gift");
 const out=filterCatalogRows(rows,q);
 assert.deepEqual(out.selected.map(x=>x.name),["16oz Pint Glass"]);
 assert.equal(out.facets.printType.engraving,1); // other print methods remain visible
 assert.equal(out.facets.printType.uv,1);
 assert.equal(out.facets.category.apparel,0);
});
test("multi-method product matches UV and etching without making two products",()=>{
 const uv=filterCatalogRows(rows,readCatalogQuery("print=uv&category=drinkware"));
 const etching=filterCatalogRows(rows,readCatalogQuery("print=etching&category=drinkware"));
 assert.ok(uv.selected.some(x=>x.name==="Skinny Tumbler"));
 assert.ok(etching.selected.some(x=>x.name==="Skinny Tumbler"));
});
test("availability, mockups, price range, catalog sorting and empty source tags",()=>{
 const out=filterCatalogRows(rows,readCatalogQuery("available=1&has_mockups=1&price_max=750&sort=price-high"));
 assert.deepEqual(out.selected.map(x=>x.name),["Leather Wrapped Flask","16oz Pint Glass"]);
 const clothes=filterCatalogRows(rows,readCatalogQuery("category=apparel"));
 assert.deepEqual(clothes.selected.map(x=>x.name),["Cotton Crewneck Sweatshirt"]);
});
