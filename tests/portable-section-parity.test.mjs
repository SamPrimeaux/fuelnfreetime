import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
const read = (path) => fs.readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("self-contained CMS package and host use identical published/editor renderer",()=>{
 for(const ext of ["js","css"]) {
  assert.equal(
    read("apps/ecommerce-cms-agentsam/packages/theme-contract/runtime/portable-sections."+ext),
    read("packages/theme-contract/runtime/portable-sections."+ext),
    "Root and portable app section implementations diverged: "+ext
  );
 }
});
