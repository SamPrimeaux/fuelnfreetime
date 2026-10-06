/**
 * Browser proof that a genuine Revise Campaigns section uses the SAME shared
 * renderer when mounted inside an existing Heuristic Shop storefront, and the
 * additional Revise bundle is only loaded when explicitly needed.
 */
import assert from "node:assert/strict";
import http from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { reviseAtlas } from "../packages/theme-contract/runtime/revise-atlas-source.js";

const exec = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = p => readFileSync(path.join(root, p), "utf8");
const built = path.join(root, "dist/assets");
const fixture = JSON.parse(file("apps/ecommerce-cms-agentsam/fixtures/fnf-revise-site.json"));
const original = fixture.pages.find(p => p.id === "campaigns").sections
  .find(s => s.preset === "revise/before-after");
const entry = {
  key: "campaigns-before-after-3", status: "draft", sort_order: 75,
  content: reviseAtlas.fromSiteSection(original, fixture.media),
};
assert.deepEqual(reviseAtlas.validate(entry.content.__editor.themePreset, entry.content), { ok:true });
assert.ok(existsSync(path.join(built, "js/revise-atlas.js")),
  "Run npm run build:admin before storefront acceptance test");
const chrome = [
  "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium", "/usr/bin/chromium-browser",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
].find(existsSync);
assert.ok(chrome, "Chrome is required");

const probe = "<script>setTimeout(function(){" +
  "var before=document.querySelector('link[data-revise-atlas]')!==null;" +
  "window.postMessage(" + JSON.stringify({
    type:"fnf-cms-preview", slug:"shop", siteSections:[], sections:[entry]
  }) + ",location.origin);" +
  "setTimeout(function(){" +
  "var scene=document.querySelector('[data-portable-preset=\"revise-atlas/before-after\"]');" +
  "var stage=scene?.querySelector('.iam-before-after__stage');" +
  "var result={loadedBeforeMessage:before,loadedAfterMessage:!!document.querySelector('link[data-revise-atlas]')," +
  "preset:scene?.getAttribute('data-source-renderer')," +
  "heading:scene?.textContent?.slice(0,300)," +
  "isInsideRealShop:!!document.querySelector('.shop-hero')," +
  "stagePosition:stage?getComputedStyle(stage).position:null," +
  "stageBackground:stage?getComputedStyle(stage).backgroundColor:null};" +
  "var out=document.createElement('pre');out.id='browser-result';out.textContent=JSON.stringify(result);document.body.append(out);" +
  "},1500);" +
  "},500)</script>";
const store = file("packages/heuristic-theme/storefront/shop.html")
  .replace("</body>", probe + "</body>");
const server=http.createServer((req,res)=>{
  const p=new URL(req.url||"/","http://localhost").pathname;
  if(p==="/shop"){
    res.writeHead(200,{"content-type":"text/html;charset=utf-8"}).end(store);
    return;
  }
  const asset = p.startsWith("/js/") ?
    path.join(built, p.slice(1)) : path.join(root,"packages/heuristic-theme/storefront",p.slice(1));
  if(!asset.startsWith(root+path.sep) || !existsSync(asset)){
    if(p.startsWith("/api/")) res.writeHead(404,{"content-type":"application/json"}).end('{"error":"no published CMS"}');
    else res.writeHead(404).end();
    return;
  }
  const ext=path.extname(asset);
  const mime=ext===".js"?"application/javascript":ext===".css"?"text/css":"application/octet-stream";
  res.writeHead(200,{"content-type":mime}).end(readFileSync(asset));
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
let dom;
try{
  const url="http://127.0.0.1:"+server.address().port+"/shop";
  ({stdout:dom}=await exec(chrome,["--headless=new","--disable-gpu","--disable-dev-shm-usage",
    "--no-sandbox","--virtual-time-budget=6500","--window-size=1440,1100","--dump-dom",url],
    {timeout:60000,encoding:"utf8",maxBuffer:1<<23}));
}finally{server.close()}
const match=dom.match(/<pre id="browser-result">([^<]+)<\/pre>/);
assert.ok(match,"Heuristic storefront never completed shared Revise runtime test");
const result=JSON.parse(match[1].replaceAll("&quot;",'"').replaceAll("&amp;","&").replaceAll("&lt;","<").replaceAll("&gt;",">"));
console.log(JSON.stringify(result,null,2));
assert.equal(result.loadedBeforeMessage,false,"Ordinary Heuristic pages must not load donor bundles");
assert.equal(result.loadedAfterMessage,true,"Pages with Revise content must load real donor styles");
assert.equal(result.preset,"revise/before-after");
assert.equal(result.isInsideRealShop,true);
assert.equal(result.stagePosition,"relative");
assert.equal(result.stageBackground,"rgb(228, 223, 213)");
console.log("PASS: original Revise section renders inside real FNF storefront, lazy-loaded without theme bleed");
