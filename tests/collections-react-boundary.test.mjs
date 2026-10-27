import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { adminRouteForPath } from "../apps/ecommerce-cms-agentsam/backend/lib/route-manifest.js";
const read = (path) => readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("collection library and editor are TypeScript routes without the old HTML form",()=>{
  assert.equal(existsSync(new URL("../apps/ecommerce-cms-agentsam/frontend/static/collections.html",import.meta.url)),false);
  assert.equal(existsSync(new URL("../apps/ecommerce-cms-agentsam/frontend/static/js/collection-manager.js",import.meta.url)),false);
  assert.equal(adminRouteForPath("/admin/collections/new").handler,"admin-spa");
  assert.equal(adminRouteForPath("/admin/collections/14").handler,"admin-spa");
  const app=read("apps/ecommerce-cms-agentsam/frontend/src/App.tsx");
  assert.match(app,/CollectionLibrary/);
  assert.match(app,/CollectionEditor/);
  const layout=read("apps/ecommerce-cms-agentsam/frontend/src/layout/AdminLayout.tsx");
  assert.match(layout,/admin-dock-off/);
});
test("mobile nav, shell brand, page search and routes share collection ownership",()=>{
  const shell=read("apps/ecommerce-cms-agentsam/frontend/shell.js");
  const manifest=JSON.parse(read("apps/ecommerce-cms-agentsam/agentsam.app.json"));
  const dock=JSON.parse(read("apps/ecommerce-cms-agentsam/.agentsam/app.json"));
  assert.match(shell,/installCommandPalette\(\)/);
  assert.match(shell,/loadShellCompany\(\)/);
  assert.doesNotMatch(shell,/imagedelivery\.net\/g7wf/);
  for(const data of [manifest,dock]){
    const products=data.dock.tabs.find(t=>t.id==="products");
    assert.ok(products.match.includes("/admin/collections/*"));
    assert.ok(data.dock.scopes.some(scope=>scope.id==="collections"));
  }
});
