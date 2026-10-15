import {test} from "node:test";
import assert from "node:assert/strict";
import {
  buildBlockTree,installedDefinition,parsePresets,placementAllowed,resolveTypedValue,
} from "../apps/ecommerce-cms-agentsam/backend/cms/composition-contract.ts";
import {readCanonicalComposition} from "../apps/ecommerce-cms-agentsam/backend/cms/canonical-composition.mjs";
import {normalizeCmsDefinition} from "../apps/ecommerce-cms-agentsam/backend/cms/definition-registry.mjs";

const row=(id,parent=null,section="section-1",order=0)=>({
  id,section_id:section,parent_block_id:parent,
  block_key:id,block_type:"theme_block",sort_order:order,
  content_json:JSON.stringify({label:id}),
});
const installed=metadata=>installedDefinition({
  definition_key:"hero",kind:"section",version:"1",origin:"package",
  status:"active",metadata,allowedBlocks:["heading","button"],maxBlocks:4,
});
test("installed definitions preserve categorized presets without minting extra types",()=>{
  const def=installed({rendererRef:"verified.hero",placement:["template"],
    presets:[{key:"editorial",label:"Editorial",category:"Storytelling",
      settings:{alignment:"center"},blocks:[{
        key:"first-heading",definitionKey:"heading",settings:{text:"A"},
        children:[{key:"cta",definitionKey:"button",settings:{label:"Go"}}]
      }]}]});
  assert.equal(def.kind,"section");
  assert.equal(def.presets[0].blocks[0].children[0].definitionKey,"button");
  assert.equal(placementAllowed(def,"template"),true);
  assert.equal(placementAllowed(def,"footer"),false);
  assert.equal(def.presets[0].category,"Storytelling");
  assert.throws(()=>parsePresets([{key:"a",label:"A"},{key:"a",label:"Again"}]),/duplicate_preset/);
  assert.throws(()=>parsePresets([{key:"hero",label:"Bad",blocks:[{key:"A",definitionKey:"button"}]}]),/invalid_preset_block/);
});
test("block kinds do not collapse theme/local/app into one semantic type",()=>{
  const base={definition_key:"a",kind:"block",version:"1",origin:"app",status:"active"};
  assert.equal(installedDefinition({...base,metadata:{blockKind:"app_block"}}).kind,"app_block");
  assert.equal(installedDefinition({...base,metadata:{blockKind:"section_block"}}).kind,"section_block");
  assert.equal(installedDefinition({...base,metadata:{}}).kind,"theme_block");
  assert.throws(()=>installedDefinition({...base,metadata:{blockKind:"unknown"}}),/invalid_block_kind/);
  assert.throws(()=>installed({placement:["other-region"]}),/invalid_placement/);
});
test("canonical nested block tree preserves identity, children, order and settings",()=>{
  const tree=buildBlockTree("section-1",[
    row("b",null,"section-1",20),row("child","b","section-1",0),row("a",null,"section-1",10),
  ]);
  assert.deepEqual(tree.map(n=>n.id),["a","b"]);
  assert.equal(tree[1].children[0].id,"child");
  assert.equal(tree[1].children[0].settings.label,"child");
  assert.equal(tree[0].children.length,0);
});
test("canonical tree rejects orphan, cross-account section, duplicate, cycle and excess depth",()=>{
  assert.throws(()=>buildBlockTree("s",[row("orphan","gone","s")]),/orphan_block/);
  assert.throws(()=>buildBlockTree("s",[row("a",null,"else")]),/cross_section_block/);
  assert.throws(()=>buildBlockTree("s",[row("a",null,"s"),row("a",null,"s")]),/duplicate_block_id/);
  assert.throws(()=>buildBlockTree("s",[row("a","b","s"),row("b","a","s")]),/block_cycle/);
  assert.throws(()=>buildBlockTree("s",[row("a",null,"s"),row("b","a","s")],0),/block_depth_exceeded/);
});
test("dynamic binding validates compatible typed sources and requires injected authorized resolver",()=>{
  assert.equal(resolveTypedValue("text",{mode:"static",value:"Local"},()=>{throw Error("should not read")}),"Local");
  const binding={mode:"dynamic",source:{resource:"product",field:"title",type:"text"}};
  assert.equal(resolveTypedValue("text",binding,()=> "Product title"),"Product title");
  assert.throws(()=>resolveTypedValue("number",binding,()=> 42),/incompatible_binding_type/);
  assert.throws(()=>resolveTypedValue("text",binding,()=>undefined),/unresolved_binding/);
  assert.throws(()=>resolveTypedValue("text",binding,()=>123),/binding_value_type/);
  assert.throws(()=>resolveTypedValue("text",{mode:"dynamic",source:{resource:"../../secret",field:"key",type:"text"}},()=>""),/invalid_binding_source/);
});
test("bad preset metadata is diagnosed, not silently advertised as installable",()=>{
  const normalized=normalizeCmsDefinition({
    id:"def",definition_key:"hero",kind:"section",version:"1",label:"Hero",
    origin:"package",status:"active",settings_schema_json:"{}",
    allowed_blocks_json:"[]",metadata_json:'{"presets":[{"key":"A"}]}',
  });
  assert.equal(normalized.composition,null);
  assert.match(normalized.compositionError,/invalid_preset/);
});
test("canonical D1 reader is account scoped and returns real nested blocks",async()=>{
  const queries=[];
  const db={
    prepare(sql){
      const stmt={bind(...args){queries.push({sql,args});return this;},
        async first(){return {id:"page-1",slug:"shop",title:"Shop",
          page_type:"standard",template_key:"product.default",status:"draft",metadata_json:"{}"};},
        async all(){
          return {results:sql.includes("FROM cms_page_sections WHERE")
            ? [{id:"section-1",section_key:"hero",section_type:"hero",sort_order:0,
                status:"draft",inline_content_json:'{"heading":"Hello"}',content_version:1,
                metadata_json:"{}"}]
            : [row("outer",null,"section-1"),row("inner","outer","section-1")]};
        }
      };
      return stmt;
    },
  };
  const found=await readCanonicalComposition({DB:db},"tenant-a","shop");
  assert.equal(found.authority,"cms_d1_installed");
  assert.equal(found.sections[0].blocks[0].children[0].id,"inner");
  assert.equal(found.sections[0].settings.heading,"Hello");
  assert.deepEqual(queries.map(q=>q.args),[
    ["tenant-a","shop"],["tenant-a","page-1"],["tenant-a","page-1"],
  ]);
  await assert.rejects(readCanonicalComposition({DB:db},"tenant-a","../other"),/invalid_scope/);
});
