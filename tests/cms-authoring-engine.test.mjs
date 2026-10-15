import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import { build } from 'esbuild';

const base = new URL('../', import.meta.url);
const file = name => readFileSync(new URL(name,base),'utf8');
const entry = new URL('../apps/ecommerce-cms-agentsam/cms/authoring/engine.ts',import.meta.url).pathname;

async function api() {
  const bundle = await build({
    entryPoints:[entry],bundle:true,write:false,platform:'browser',format:'iife',
    globalName:'AgentSamCmsAuthoring',target:'es2022'
  });
  const sandbox = {structuredClone};
  vm.runInNewContext(bundle.outputFiles[0].text,sandbox);
  return sandbox.AgentSamCmsAuthoring;
}
const section = {
  id:'def-hero',key:'hero',kind:'section',version:'1.0.0',
  status:'active',origin:'builtin',label:'Hero',
  metadata:{rendererKey:'core.hero'},
  allowedBlocks:['button','text'],maxBlocks:2,fields:{
    alignment:{type:'select',label:'Alignment',options:[
      {value:'left',label:'Left'},{value:'center',label:'Center'}
    ],default:'left'}
  }
};
const button = {
  id:'def-button',key:'button',kind:'block',version:'1.0.0',status:'active',
  origin:'builtin',label:'Button',metadata:{rendererKey:'core.button'},
  fields:{
    label:{type:'text',label:'Label',default:'Shop all'},
    style:{type:'select',label:'Style',default:'primary',options:[
      {value:'primary',label:'Primary'},{value:'custom',label:'Custom'}
    ]},
    background:{type:'color',label:'Background',visibleWhen:[
      {fieldId:'style',operator:'equals',value:'custom'}
    ]}
  }
};
const unavailable = {
  id:'def-image',key:'image',kind:'block',version:'1.0.0',status:'active',
  origin:'generated',label:'Image',fields:{}
};

test('TypeScript definitions drive inspector state and conditional controls',async()=>{
  const { createAuthoringEngine } = await api();
  const engine = createAuthoringEngine([section,button]);
  assert.equal(engine.count,2);
  assert.equal(engine.inspector('block','button',{}).length,2);
  assert.equal(engine.inspector('block','button',{})[0].value,'Shop all');
  assert.equal(engine.inspector('block','button',{})[0].valueSource,'default');
  const fields = engine.inspector('block','button',{label:'Buy now',style:'custom'});
  assert.equal(fields.length,3);
  assert.equal(fields[0].valueSource,'stored');
  assert.equal(engine.describe('block','button',{label:'Buy now'}),'Button — Buy now');
});

test('renderer field projection respects typed visibility without hiding stale fields',async()=>{
  const {createAuthoringEngine}=await api();
  const engine=createAuthoringEngine([section,button]);
  const native=[
    {key:'label',type:'text',label:'Legacy Label'},
    {key:'style',type:'select',label:'Style'},
    {key:'background',type:'color',label:'Legacy Background'}
  ];
  const primary=engine.rendererFields('block','button',native,{style:'primary'});
  assert.deepEqual(primary.map(f=>f.key),['label','style']);
  assert.equal(primary[0].label,'Label');
  const custom=engine.rendererFields('block','button',native,{style:'custom'});
  assert.equal(custom.length,3);
  const extra=[...native,{key:'brandNew',type:'text',label:'Existing Renderer Field'}];
  const preserved=engine.rendererFields('block','button',extra,{style:'primary'});
  assert.equal(JSON.stringify(preserved),JSON.stringify(extra));
  assert.notEqual(preserved,extra);
});

test('insertion respects ready renderer, allowed child, max count',async()=>{
  const {createAuthoringEngine} = await api();
  const engine = createAuthoringEngine([section,button,unavailable]);
  assert.equal(engine.eligibility({parentKey:'hero',childKey:'button',existingChildKeys:[]}).allowed,true);
  assert.equal(engine.eligibility({parentKey:'hero',childKey:'button',existingChildKeys:['text','text']}).reason,'parent_full');
  assert.equal(engine.eligibility({parentKey:'hero',childKey:'image',existingChildKeys:[]}).reason,'renderer_unavailable');
  assert.equal(engine.catalog('hero').map(v=>v.key).join(','),'button');
});

test('invalid definitions report diagnostics instead of generating placeholders',async()=>{
  const {createAuthoringEngine,normalizeDefinition} = await api();
  const bad={...button,key:'unsafe/../component'};
  const badField={...button,id:'bad-field',fields:{
    payload:{type:'execute-js',label:'Payload'}
  }};
  const engine=createAuthoringEngine([bad,badField,button]);
  assert.equal(engine.count,1);
  assert.equal(engine.diagnostics.length,2);
  assert.throws(()=>normalizeDefinition(badField),/unsupported_type/);
});

test('newer definition version replaces older without mutating the original',async()=>{
  const {createAuthoringEngine} = await api();
  const newer={...button,version:'1.10.0',label:'Action'};
  const engine=createAuthoringEngine([button,newer]);
  assert.equal(engine.count,1);
  assert.equal(engine.get('block','button').version,'1.10.0');
  assert.equal(button.label,'Button');
});

test('Theme Studio consumes compiled engine without forked editor or page list',()=>{
  const html=file('apps/ecommerce-cms-agentsam/frontend/static/theme-editor.html');
  const shared=file('apps/ecommerce-cms-agentsam/frontend/static/js/pages-shared.js');
  const editor=file('apps/ecommerce-cms-agentsam/frontend/static/js/theme-editor.js');
  const sync=file('scripts/sync-app-frontend.mjs');
  assert.ok(html.indexOf('/admin/js/cms-authoring-engine.js') <
    html.indexOf('/admin/js/pages-shared.js'));
  assert.match(shared,/createAuthoringEngine\(data\.definitions \|\| \[\]\)/);
  assert.match(editor,/cmsAuthoring\?\.rendererFields\('block'/);
  assert.match(editor,/cmsAuthoring\.describe\('block'/);
  assert.match(sync,/cms\/authoring\/engine\.ts/);
  const backend=file('apps/ecommerce-cms-agentsam/backend/cms/api.js');
  assert.match(backend,/import \{ createAuthoringEngine \} from/);
  assert.match(backend,/authoring_diagnostics: authoring\.diagnostics/);
  assert.doesNotMatch(file('apps/ecommerce-cms-agentsam/cms/authoring/engine.ts'),/\b(?:import|require)\b[^\n]*registry/);
});
