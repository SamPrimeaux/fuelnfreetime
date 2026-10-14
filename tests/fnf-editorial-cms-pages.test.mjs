import assert from "node:assert/strict";
import test from "node:test";
import { getRegistryPage, listRegistryPages } from "../apps/ecommerce-cms-agentsam/backend/cms/registry.js";
import "../packages/theme-contract/runtime/portable-sections.js";

const slugs=["fnf-editorial-home","fnf-field-notes","fnf-product-story"];
const portable=globalThis.ThemePortableSections;

test("editorial concept pages are draft CMS pages with installed section renderers",()=>{
  const listed=listRegistryPages();
  for(const slug of slugs) {
    assert.ok(listed.some(page=>page.slug===slug&&page.status==="draft"));
    const page=getRegistryPage(slug);
    assert.equal(page.source,"registry");
    assert.equal(page.status,"draft");
    assert.ok(page.sections.length>=2);
    for(const section of page.sections) {
      const preset=section.content.__editor.themePreset;
      assert.equal(section.status,"draft");
      assert.ok(portable.get(preset),"Missing actual preset renderer: "+preset);
      assert.deepEqual(portable.validate(preset,section.content),{ok:true});
      const html=portable.render(section);
      assert.match(html,/data-cms-section/);
      assert.ok(html.length>250);
      assert.doesNotMatch(html,/Product truth before publishing|fabricated|mock prices|to verify/i);
    }
  }
});

test("story cards do not present unpublished article links as clickable",()=>{
 const grid=getRegistryPage("fnf-field-notes").sections.find(section=>section.key==="field-grid");
 const html=portable.render(grid);
 assert.match(html,/The Build/);
 assert.match(html,/The Route/);
 assert.match(html,/The Makers/);
 assert.doesNotMatch(html,/href="#"/);
 assert.doesNotMatch(html,/Read the story/);
});
