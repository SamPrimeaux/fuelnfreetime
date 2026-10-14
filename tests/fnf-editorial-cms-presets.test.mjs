import assert from "node:assert/strict";
import test from "node:test";
import "../packages/theme-contract/runtime/portable-sections.js";
const runtime=globalThis.ThemePortableSections;

const ids=["fnf/field-notes-hero","fnf/field-notes-grid","fnf/earned-hours-panel","fnf/product-story-panel"];
test("four editable editorial CMS presets have real renderer output",()=>{
 for(const id of ids) {
  assert.ok(runtime.catalog().some((item)=>item.id===id));
  const content=runtime.defaults(id);
  assert.deepEqual(runtime.validate(id,content),{ok:true});
  const markup=runtime.render({key:"preview-123",content});
  assert.match(markup,/data-cms-section="preview-123"/);
  assert.match(markup,/data-portable-preset="fnf\//);
  assert.doesNotMatch(markup,/Product truth before publishing|No mock prices|to verify/i);
 }
});
test("field-note cards persist repeatable CMS content and render only supplied hrefs",()=>{
 const c=runtime.defaults("fnf/field-notes-grid");
 assert.equal(c.__editor.blocks.length,3);
 assert.deepEqual(runtime.validate("fnf/field-notes-grid",c),{ok:true});
 const before=runtime.render({key:"field-grid",content:c});
 assert.match(before,/The Build/);
 assert.doesNotMatch(before,/href="#"/);
 c.card1.href="/stories/the-build";
 c.card1.name="Garage work";
 const after=runtime.render({key:"field-grid",content:c});
 assert.match(after,/href="\/stories\/the-build"/);
 assert.match(after,/Garage work/);
 assert.deepEqual(runtime.validate("fnf/field-notes-grid",c),{ok:true});
 c.card1.href="javascript:alert(1)";
 assert.equal(runtime.validate("fnf/field-notes-grid",c).ok,false);
 assert.doesNotMatch(runtime.render({key:"field-grid",content:c}),/javascript:alert/);
});
test("editorial field strings escape dangerous markup",()=>{
 const c=runtime.defaults("fnf/field-notes-hero");
 c.headline='<img src=x onerror="alert(1)">';
 assert.match(runtime.render({key:"hero",content:c}),/&lt;img/);
 assert.doesNotMatch(runtime.render({key:"hero",content:c}),/<img src=x onerror/);
});
