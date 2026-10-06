import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  createThemeEditorBridge,ThemeEditorCapabilityError,
} from '../packages/theme-contract/editor/bridge.mjs';
import {
  createCmsThemeEditorAdapter,
} from '../packages/theme-contract/editor/cms-adapter.mjs';
import {
  THEME_PROJECT_SCHEMA,validateThemeProject,createThemeProjectAdapter,
} from '../packages/theme-contract/editor/project.mjs';

const project={
  schema:THEME_PROJECT_SCHEMA,id:'portable',name:'My Theme',
  pages:[{slug:'shop',title:'Shop',template:'shop',sections:[{
    key:'hero',html:'<section><h1>Hi</h1></section>',content:{headline:'Hi',__editor:{templateKey:'hero',visibility:{enabled:true},blocks:[]}},
    schema:{key:'hero',fields:[{key:'headline',type:'text'}],blocks:[]},version:0
  }]}]
};
test('a portable theme is a draft project, not a second live CMS',()=>{
  const clone=validateThemeProject(project);
  clone.pages[0].sections[0].content.headline='Changed';
  assert.equal(project.pages[0].sections[0].content.headline,'Hi');
  assert.throws(()=>validateThemeProject({...project,id:'__proto__'}),/theme_project_invalid/);
  const pkg=JSON.parse(fs.readFileSync(new URL('../packages/theme-contract/package.json',import.meta.url)));
  assert.equal(pkg.private,true);
});
test('portable project saves through a caller-owned store, without publishing',async()=>{
  let saved=null;
  const adapter=createThemeProjectAdapter(project,{get:async()=>saved || project, save:async value=>saved=value});
  assert.equal(adapter.capabilities.publish,false);
  const current=await adapter.getPage('shop');
  assert.equal(current.sections[0].key,'hero');
  await adapter.saveDraft('shop','hero',{headline:'Fresh heading'},0);
  assert.equal(saved.pages[0].sections[0].content.headline,'Fresh heading');
  await assert.rejects(()=>adapter.publish('shop'),/not_configured/);
});
test('CMS bridge respects publisher capability and section revision',async()=>{
  const section={id:'hero',type:'heading',name:'Hero',version:3,visible:true,
    fields:{headline:'Old'},blocks:[]};
  const site={pages:[{id:'page-1',slug:'shop',title:'Shop',status:'draft',sections:[section]}]};
  let changes=0;
  const cms={
    loadSite:async()=>site,
    updateSection:async(id,{fields})=>{ assert.equal(id,'hero');section.fields=fields;changes++; },
    saveDraft:async id=>{assert.equal(id,'page-1');},
    listAssets:async()=>[],
  };
  const adapter=createCmsThemeEditorAdapter(cms,'site-1');
  assert.equal(adapter.capabilities.publish,false);
  await assert.rejects(()=>adapter.saveDraft('shop','hero',{headline:'No'},2),/version_conflict/);
  assert.equal(changes,0);
  const bridge=createThemeEditorBridge(adapter);
  await bridge.request('/api/admin/cms/pages/shop/sections/hero',{
    method:'PUT',body:JSON.stringify({content:{headline:'New'},expected_version:3}),
  });
  assert.equal(section.fields.headline,'New');
  assert.equal(changes,1);
  await assert.rejects(()=>bridge.request('/api/admin/cms/pages/shop/publish',{method:'POST'}),/not_supported/);
  assert.equal(adapter.capabilities.publish,false);
});
test('theme editing does not require store_theme_pages or another editor route',()=>{
  const root=fs.readFileSync(new URL('../apps/ecommerce-cms-agentsam/frontend/static/theme-editor.html',import.meta.url),'utf8');
  assert.match(root,/\/admin\/js\/theme-editor.js/);
  const api=fs.readFileSync(new URL('../apps/ecommerce-cms-agentsam/backend/admin/api.js',import.meta.url),'utf8');
  assert.doesNotMatch(api,/store_theme_pages/);
  assert.doesNotMatch(api,/getThemePage\(env/);
});
