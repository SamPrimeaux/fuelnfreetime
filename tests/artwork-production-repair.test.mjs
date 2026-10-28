import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {opaqueCrop,inspectDecodedArtwork,repairArtworkCandidate,inspectArtworkRepair} from "../apps/ecommerce-cms-agentsam/backend/media/artwork-repair.js";

function fixture(withPixel=true) {
 const data=new Uint8ClampedArray(4*4*4);
 if(withPixel) for(let y=1;y<3;y++)for(let x=1;x<3;x++)data[(y*4+x)*4+3]=255;
 return {width:4,height:4,data};
}
const intent={printWidthIn:2,printHeightIn:2,targetPpi:300};
test("original alpha crop computes active source pixels before print density",()=>{
 assert.deepEqual(opaqueCrop(fixture()),{x:1,y:1,width:2,height:2});
 const p=inspectDecodedArtwork(fixture(),intent);
 assert.equal(p.effective_ppi,1);
 assert.equal(p.status,"needs_detail");
 assert.equal(p.production_ready,false);
 assert.equal(p.target_source,"studio_guideline");
});
test("all-transparent source never certifies production",()=>{
 const p=inspectDecodedArtwork(fixture(false),intent);
 assert.equal(p.crop,null);
 assert.equal(p.status,"empty_artwork");
 assert.equal(p.production_ready,false);
});
test("supplier-declared target and AI reconstruction are distinct",()=>{
 const d=new Uint8ClampedArray(400*400*4);
 for(let i=3;i<d.length;i+=4)d[i]=255;
 const image={width:400,height:400,data:d};
 const supplier={ppi:200,format:"png",status:"supplier_declared"};
 const input={printWidthIn:1,printHeightIn:1,targetPpi:300};
 const plain=inspectDecodedArtwork(image,input,{},supplier);
 assert.equal(plain.status,"supplier_resolution_check_passed");
 assert.equal(plain.production_ready,false);
 const generated=inspectDecodedArtwork(image,input,{is_ai_reconstruction:true},supplier);
 assert.equal(generated.status,"visual_review_required");
 assert.equal(generated.requires_visual_review,true);
 assert.equal(generated.production_ready,false);
});
test("unregistered/unauthorized writes are rejected before touching files",async()=>{
 await assert.rejects(repairArtworkCandidate({},7,{method:"resample"},"owner"),/invalid_repair_method/);
 await assert.rejects(repairArtworkCandidate({},7,{method:"trim_transparent"},null),/actor_required/);
});
test("authenticated inspector route and deliberate before/after review are wired",()=>{
 const root=new URL("../apps/ecommerce-cms-agentsam/",import.meta.url);
 const api=readFileSync(new URL("backend/admin/api.js",root),"utf8");
 const ui=readFileSync(new URL("frontend/src/pages/products/ArtworkRepairPanel.tsx",root),"utf8");
 const studio=readFileSync(new URL("frontend/src/pages/products/StudioWorkspace.tsx",root),"utf8");
 assert.match(api,/inspectArtworkRepair\(env, Number\(m\[1\]\), input\)/);
 assert.match(api,/repairArtworkCandidate\(env, Number\(m\[1\]\), input, user\.id\)/);
 assert.match(ui,/Before \/ after — compare closely/);
 assert.match(ui,/disabled=\{!reviewed\|\|!!busy\}/);
 assert.match(studio,/onApply=\{\(candidate\) => \{/);
 assert.match(studio,/setPreparedAsset\(null\)/);
});

test("inspection reads unmodified R2 master bytes and returns measured source dimensions",async()=>{
 const original=Uint8Array.from(Buffer.from(
   "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/pCsAAAAASUVORK5CYII=","base64"));
 const source={id:14,filename:"test-master.png",r2_key:"masters/test-master.png",
   content_type:"image/png",meta_json:"{}"};
 let readCount=0;
 const env={
   WEBSITE_ASSETS:{async get(key){readCount++;assert.equal(key,source.r2_key);
     return {size:original.length,arrayBuffer:async()=>original.buffer.slice(
       original.byteOffset,original.byteOffset+original.byteLength)};}},
   DB:{prepare(sql){return {bind(...args){return {
     first:async()=>sql.includes("FROM media_assets WHERE id")&&Number(args[0])===14?source:null,
     all:async()=>({results:[]}),
   };}};}},
 };
 // The Worker uses @jsquash wasm; inject a decoded pixel fixture for Node-only
 // storage integration coverage so Node does not import Cloudflare's .wasm loaders.
 const inspected=await inspectArtworkRepair(env,14,
   {print_width_in:1,print_height_in:1,target_ppi:300},
   {decoder:async ({bytes,mime})=>{
     assert.equal(mime,"image/png");
     assert.deepEqual(bytes,original);
     return {width:1,height:1,data:new Uint8ClampedArray([255,255,255,255])};
   }});
 assert.equal(inspected.ok,true);
 assert.equal(inspected.source.id,14);
 assert.equal(inspected.assessment.source_px.width,1);
 assert.equal(inspected.assessment.source_px.height,1);
 assert.equal(inspected.assessment.production_ready,false);
 assert.equal(inspected.source_preserved,true);
 assert.equal(readCount,1);
});
