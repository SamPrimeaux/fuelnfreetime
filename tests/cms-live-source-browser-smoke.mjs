/**
 * Genuine Chrome fixture: real Heuristic /shop HTML + actual CMS theme editor.
 * No production writes. Tests editor source parity and draft reconciliation.
 */
import assert from "node:assert/strict";
import http from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { getRegistryPage, registryForAdmin } from "../apps/ecommerce-cms-agentsam/backend/cms/registry.js";

const exec = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = p => readFileSync(path.join(root, p), "utf8");
const chrome = [
 "/usr/bin/google-chrome","/usr/bin/google-chrome-stable",
 "/usr/bin/chromium","/usr/bin/chromium-browser",
 "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
].find(existsSync);
assert.ok(chrome, "Chrome is required for CMS visual acceptance");

const shop = getRegistryPage("shop");
shop.status = "draft";
shop.content_authority = "storefront-html";
shop.live_route = "/shop";
shop.sections = shop.sections.map(s => ({...s,version:1}));
const site = getRegistryPage("site");
const pages = {ok:true,pages:[{slug:"shop",title:"Shop",status:"draft",has_live_storefront:true, cms_published:false,draft_exists:true}]};
const shim = "<script>" +
 "window.confirm=()=>true;window.__submitted=null;window.__linked=false;" +
 "window.renderShell=function(_,html){document.body.insertAdjacentHTML('afterbegin',html);};" +
 "window.adminFetch=async function(url,options){" +
 "if(url.endsWith('/registry'))return " + JSON.stringify(registryForAdmin()) + ";" +
 "if(url.endsWith('/pages/site'))return {page:" + JSON.stringify(site) + "};" +
 "if(url.endsWith('/pages/shop/import-live')){window.__submitted=JSON.parse(options.body);window.__linked=true;return {ok:true,published:false};}" +
 "if(url.endsWith('/pages/shop'))return {seeded:true,page:{...(" + JSON.stringify(shop) + "),content_authority:window.__linked?'cms-draft-linked':'storefront-html'}};" +
 "if(url.endsWith('/pages'))return " + JSON.stringify(pages) + ";" +
 "throw Error('Unexpected API '+url);};</script>";

const probe = "<script>setTimeout(function(){" +
 "var frame=document.getElementById('theme-preview');" +
 "var before={src:frame.getAttribute('src'),headline:frame.contentDocument?.querySelector('[data-cms-section=\"hero\"] [data-cms=\"headline\"]')?.textContent," +
 "visible:!document.getElementById('te-import-live').hidden,inspector:document.getElementById('te-field-hero-headline')?.value};" +
 "document.getElementById('te-import-live').click();" +
 "setTimeout(function(){var pre=document.createElement('pre');pre.id='browser-result';" +
 "pre.textContent=JSON.stringify({before,imported:window.__submitted,linked:window.__linked});document.body.append(pre);},400);" +
 "},2200)</script>";
const template = file("apps/ecommerce-cms-agentsam/frontend/static/theme-editor.html")
 .replace('<script src="/admin/js/shell.js"></script>',shim).replace("</body>",probe+"</body>");
const storefront=file("packages/heuristic-theme/storefront/shop.html");
const assets = {
 "/admin/js/pages-shared.js":"apps/ecommerce-cms-agentsam/frontend/static/js/pages-shared.js",
 "/admin/js/theme-editor.js":"apps/ecommerce-cms-agentsam/frontend/static/js/theme-editor.js",
 "/admin/css/theme-editor.css":"apps/ecommerce-cms-agentsam/frontend/static/css/theme-editor.css",
 "/admin/css/console.css":"apps/ecommerce-cms-agentsam/frontend/static/css/console.css",
 "/admin/css/admin.css":"apps/ecommerce-cms-agentsam/frontend/static/css/admin.css",
 "/js/cms-hydrate.js":"packages/heuristic-theme/storefront/js/cms-hydrate.js"
};
const server=http.createServer((req,res)=>{
 const url=new URL(req.url||"/","http://localhost").pathname;
 if(url==="/admin/theme-editor")res.writeHead(200,{"content-type":"text/html"}).end(template);
 else if(url==="/shop")res.writeHead(200,{"content-type":"text/html"}).end(storefront);
 else if(assets[url])res.writeHead(200,{"content-type":url.endsWith(".css")?"text/css":"application/javascript"}).end(file(assets[url]));
 else if(url.startsWith("/api/"))res.writeHead(404,{"content-type":"application/json"}).end('{"error":"not published"}');
 else res.writeHead(404).end();
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
let dom;
try{
 const url="http://127.0.0.1:"+server.address().port+"/admin/theme-editor?slug=shop";
 ({stdout:dom}=await exec(chrome,["--headless=new","--disable-gpu","--disable-dev-shm-usage","--no-sandbox",
   "--virtual-time-budget=7000","--window-size=1440,1000","--dump-dom",url],
   {timeout:60000,encoding:"utf8",maxBuffer:1<<22}));
}finally{server.close()}
const match=dom.match(/<pre id="browser-result">([^<]+)<\/pre>/);
assert.ok(match,"Browser never completed source reconciliation");
const result=JSON.parse(match[1].replaceAll("&quot;",'"').replaceAll("&amp;","&").replaceAll("&lt;","<").replaceAll("&gt;",">"));
console.log(JSON.stringify(result,null,2));
assert.match(result.before.src,/^\/shop\?_=/);
assert.match(result.before.headline,/Time is the\s*real horsepower/i);
assert.equal(result.before.visible,true);
assert.match(result.before.inspector,/Time is the\s*real horsepower/i);
assert.equal(result.imported.mode,"reconcile");
assert.ok(result.imported.sections.some(s=>s.key==="hero" && /Time is the\s*real horsepower/i.test(s.content.headline)));
assert.ok(!result.imported.sections.some(s=>s.key==="newsletter"));
assert.equal(result.linked,true);
console.log("PASS: real live Shop content enters the actual CMS editor without production writes");
