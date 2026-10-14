import assert from "node:assert/strict";
import test from "node:test";
import { PAGE_REGISTRY } from "../apps/ecommerce-cms-agentsam/backend/cms/registry.js";
import layouts from "../apps/ecommerce-cms-agentsam/fixtures/fnf-editorial-cms-pages.v1.json" with { type: "json" };
import "../packages/theme-contract/runtime/portable-sections.js";

const portable=globalThis.ThemePortableSections;
function instance(section) {
 const defaults=portable.defaults(section.preset);
 return {key:section.key,content:{
  ...structuredClone(defaults),...structuredClone(section.content),
  __editor:structuredClone(defaults.__editor),
 }};
}

test("editorial page arrangements are preview recipes, not auto-published CMS routes",()=>{
 assert.equal(layouts.status,"draft");
 assert.deepEqual(layouts.pages.map(p=>p.slug),
  ["fnf-editorial-home","fnf-field-notes","fnf-product-story"]);
 for(const page of layouts.pages) {
  assert.equal(PAGE_REGISTRY[page.slug],undefined);
  assert.ok(page.sections.length>=2);
  for(const fixture of page.sections) {
   const entry=instance(fixture);
   assert.deepEqual(portable.validate(fixture.preset,entry.content),{ok:true});
   const html=portable.render(entry);
   assert.match(html,/data-cms-section/);
   assert.ok(html.length>250);
   assert.doesNotMatch(html,/Product truth before publishing|fabricated|mock prices|to verify/i);
  }
 }
});
test("unlinked field note cards don't become fake clickable articles",()=>{
 const page=layouts.pages.find(p=>p.slug==="fnf-field-notes");
 const grid=instance(page.sections.find(s=>s.key==="field-grid"));
 const html=portable.render(grid);
 assert.match(html,/The Build/);
 assert.match(html,/The Route/);
 assert.match(html,/The Makers/);
 assert.doesNotMatch(html,/href="#"/);
 assert.doesNotMatch(html,/Read the story/);
});
