import test from "node:test";
import assert from "node:assert/strict";
import { SETTING_TYPES, normalizeSettingFields } from "../apps/ecommerce-cms-agentsam/frontend/static/js/generated-settings-schema.mjs";
import { normalizeCmsDefinition } from "../apps/ecommerce-cms-agentsam/backend/cms/definition-registry.mjs";

test("the same typed vocabulary recognizes 3D media without treating it as image or video",()=>{
 assert.ok(SETTING_TYPES.includes("model3d"));
 const declared={scene:{type:"model3d",label:"3D scene",default:"asset_scene_glb"}};
 const resolved=normalizeSettingFields(declared,{});
 assert.equal(resolved.fields.scene.type,"model3d");
 assert.equal(resolved.settings.scene,"asset_scene_glb");
 assert.throws(()=>normalizeSettingFields(declared,{scene:"https://other.invalid/model.glb"}),/Invalid instance value/);
 assert.throws(()=>normalizeSettingFields(declared,{scene:"../unsafe.glb"}),/Invalid instance value/);
 const row=normalizeCmsDefinition({id:"def_scene",definition_key:"scene",kind:"section",version:"1",label:"3D scene",origin:"imported",status:"active",settings_schema_json:JSON.stringify(declared),allowed_blocks_json:"[]"});
 assert.equal(row.fields.scene.type,"model3d");
 assert.equal(row.origin,"imported");
});

test("legacy semantic type descriptors preserve rich field metadata during definition discovery",()=>{
 const settings={
  gallery:{type:"media",label:"Gallery background",description:"Original source asset"},
  title:{type:"richtext",label:"Editorial heading",default:"Keep design"},
  width:{type:"range",label:"Width",min:200,max:1440,step:20,unit:"px"},
  model:{type:"model3d",label:"3D model"}
 };
 const row=normalizeCmsDefinition({id:"def_legacy",definition_key:"legacy-banner",kind:"section",version:"1",label:"Legacy Banner",origin:"imported",status:"active",settings_schema_json:JSON.stringify(settings),allowed_blocks_json:"[]"});
 assert.deepEqual(row.fields,settings);
 assert.equal(row.fields.width.max,1440);
 assert.equal(row.fields.title.type,"richtext");
});
