import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here=path.dirname(fileURLToPath(import.meta.url));
const manifest=JSON.parse(readFileSync(path.join(here,"concepts.json"),"utf8"));

test("FNF concepts remain installation-owned, draft-only, and richly described",()=>{
 assert.equal(manifest.tenant,"fuelnfreetime");
 assert.equal(manifest.campaignStatus,"draft");
 assert.equal(manifest.ownerApprovalRequired,true);
 assert.equal(manifest.products.length,3);
 for(const p of manifest.products){
   assert.equal(p.status,"draft");
   assert.equal(p.approval,"pending-owner-review");
   assert.ok(p.description.length>200,p.name+" needs real editorial writing");
   assert.ok(p.seo_title.length>25&&p.seo_title.length<75);
   assert.ok(p.seo_description.length>=100&&p.seo_description.length<=170);
   assert.match(p.slug,/^fnf-field-01-/);
   for(const filename of Object.values(p.artwork)){
     assert.ok(existsSync(path.join(here,filename)),filename+" missing original vector source");
   }
 }
});
