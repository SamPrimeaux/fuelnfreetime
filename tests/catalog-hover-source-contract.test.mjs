import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const source=readFileSync(new URL("../apps/ecommerce-cms-agentsam/frontend/src/pages/products/CatalogHoverImage.tsx",import.meta.url),"utf8");
test("supplier mockup hover keeps blank fallback and ignores null source URLs",()=>{
  assert.match(source,/sources\.filter\(\(value\):value is string=>typeof value==="string"&&value\.length>0\)/);
  assert.match(source,/image\.onerror=\(\)=>setLoaded\(false\)/);
  assert.match(source,/loaded&&sampleUrl&&<img/);
  assert.match(source,/onPointerEnter=\{preload\}/);
});
