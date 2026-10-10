import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {createRequire} from "node:module";
import {registryForAdmin,getRegistryPage} from "../apps/ecommerce-cms-agentsam/backend/cms/registry.js";

const require=createRequire(new URL("../apps/ecommerce-cms-agentsam/package.json",import.meta.url));
const {JSDOM}=require("jsdom");

test("every legacy Heuristic data-cms slot has a registered section or nested block field",()=>{
 const registry=registryForAdmin(),missing=[],seen=[];
 for(const [slug,page] of Object.entries(registry.pages||{})){
  const path=new URL("../packages/heuristic-theme/storefront/"+slug+".html",import.meta.url);
  if(!existsSync(path))continue;
  const dom=new JSDOM(readFileSync(path,"utf8"));
  const snapshot=getRegistryPage(slug);
  for(const region of dom.window.document.querySelectorAll("[data-cms-section]")){
   const key=region.dataset.cmsSection;
   const sectionSchema=page.sections?.[key];
   const instance=snapshot.sections?.find(s=>s.key===key);
   if(!sectionSchema||!instance){missing.push(slug+"/"+key+": section");continue;}
   const sectionFields=new Set((sectionSchema.fields||[]).map(f=>f.key));
   const blockDefs=new Map((sectionSchema.blocks||[]).map(b=>[b.key,b]));
   const instances=new Map((instance.content?.__editor?.blocks||[]).map(b=>[b.id,b.templateKey]));
   for(const node of region.querySelectorAll("[data-cms]")){
    const original=node.dataset.cms;
    const field=original.startsWith(key+".")?original.slice(key.length+1):original;
    if(sectionFields.has(field)){seen.push(slug+"/"+key+"/"+field);continue;}
    const [id,...rest]=field.split(".");
    const block=blockDefs.get(instances.get(id));
    if(block&&block.fields?.some(f=>f.key===rest.join("."))){
      seen.push(slug+"/"+key+"/"+field);continue;
    }
    missing.push(slug+"/"+key+"/"+original);
   }
  }
  dom.window.close();
 }
 assert.ok(seen.length>=100,"expected a meaningful installed authored source inventory");
 assert.deepEqual(missing,[],"unregistered authored slots must be normalized, not silently hidden from the inspector");
});
