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
 "visible:!document.getElementById('te-import-live').hidden,liveOnly:[...document.querySelectorAll('.te-live-only-row strong')].map(e=>e.textContent)," +
 "inspector:document.getElementById('te-field-hero-headline')?.value};" +
 "var themeTrigger=document.getElementById('te-theme-trigger');" +
 "before.toolbar={theme:document.getElementById('te-theme-name')?.textContent," +
 "themeTrigger:!!themeTrigger,legacyTabs:document.querySelectorAll('#te-tabs,.te-theme-switch').length," +
 "pageVisible:getComputedStyle(document.getElementById('te-page-trigger')).display!=='none'};" +
 "themeTrigger?.click();" +
 "before.toolbar.menuOpened=!document.getElementById('te-theme-popover').hidden;" +
 "before.toolbar.options=document.querySelectorAll('[data-theme-preview]').length;" +
 "themeTrigger?.click();" +
 "if(window.innerWidth>900){" +
 "var blockButton=document.querySelector('[data-select-block=card3][data-block-section=collections]');" +
 "if(blockButton){" +
 "blockButton.click();" +
 "before.blockInspector={title:document.getElementById('te-inspector-title').textContent," +
 "groups:[...document.querySelectorAll('.te-inspector-group__head h3')].map(e=>e.textContent)," +
 "advancedClosed:!document.querySelector('[data-inspector-advanced]')?.open," +
 "parentButton:!!document.getElementById('te-inspector-parent')," +
 "fieldKeys:[...document.querySelectorAll('#te-inspector-body [data-field-key]')].map(e=>e.dataset.fieldKey)};" +
 "document.getElementById('te-inspector-parent')?.click();" +
 "before.blockInspector.parentTitle=document.getElementById('te-inspector-title')?.textContent;" +
 "}}" +
 "if(window.innerWidth<=900){" +
 "var nav=document.getElementById('te-mobile-pane-switch');" +
 "var modes=nav.querySelectorAll('[data-mobile-pane]');" +
 "var preview=document.querySelector('.theme-studio-canvas');" +
 "var tree=document.querySelector('.theme-studio-tree');" +
 "var inspector=document.querySelector('.theme-editor-panel');" +
 "var initialPreview=getComputedStyle(preview).display!=='none';" +
 "modes[0].click();var treeVisible=getComputedStyle(tree).display!=='none';" +
 "var heroRow=document.querySelector('[data-select-section=hero]');if(heroRow)heroRow.click();" +
 "var settingsVisible=getComputedStyle(inspector).display!=='none';" +
 "modes[1].click();var backToPreview=getComputedStyle(preview).display!=='none';" +
 "before.mobile={viewport:window.innerWidth,navVisible:getComputedStyle(nav).display!=='none'," +
 "initialPreview,treeVisible,settingsVisible,backToPreview," +
 "treeHasAdd:!!document.getElementById('te-add-section')," +
 "noOverflow:document.documentElement.scrollWidth<=window.innerWidth+1};" +
 "}" +
 "document.getElementById('te-import-live').click();" +
 "setTimeout(function(){var pre=document.createElement('pre');pre.id='browser-result';" +
 "pre.textContent=JSON.stringify({before,imported:window.__submitted,linked:window.__linked});document.body.append(pre);},400);" +
 "},2200)</script>";
const template = file("apps/ecommerce-cms-agentsam/frontend/static/theme-editor.html")
 .replace('<script src="/admin/js/shell.js"></script>',shim).replace("</body>",probe+"</body>");
const storefront=file("packages/heuristic-theme/storefront/shop.html");
const assets = {
 "/admin/js/pages-shared.js":"apps/ecommerce-cms-agentsam/frontend/static/js/pages-shared.js",
 "/admin/js/portable-sections.js":"packages/theme-contract/runtime/portable-sections.js",
 "/admin/js/theme-preview-registry.js":"packages/theme-contract/runtime/theme-preview-registry.js",
 "/admin/js/theme-preview-runtime.js":"packages/fnf-theme/src/editor/preview-adapter.js",
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
const results=new Map();
try{
 const url="http://127.0.0.1:"+server.address().port+"/admin/theme-editor?slug=shop";
 for(const width of [1440,744,390]){
  const {stdout:dom}=await exec(chrome,["--headless=new","--disable-gpu","--disable-dev-shm-usage","--no-sandbox",
    "--force-device-scale-factor=1","--virtual-time-budget=7000","--window-size="+width+",1000","--dump-dom",url],
    {timeout:60000,encoding:"utf8",maxBuffer:1<<22});
  const match=dom.match(/<pre id="browser-result">([^<]+)<\/pre>/);
  assert.ok(match,"Browser did not complete editor test at "+width+"px");
  results.set(width,JSON.parse(match[1].replaceAll("&quot;",'"').replaceAll("&amp;","&").replaceAll("&lt;","<").replaceAll("&gt;",">")));
 }
}finally{server.close()}
const result=results.get(1440);
console.log(JSON.stringify(result,null,2));
assert.match(result.before.src,/^\/shop\?_=/);
assert.match(result.before.headline,/Time is the\s*real horsepower/i);
assert.equal(result.before.visible,true);
assert.ok(result.before.liveOnly.some(v => /editorial/i.test(v)), "live editorial scene must appear in the tree");
assert.ok(result.before.liveOnly.some(v => /products/i.test(v)), "live product grid must appear in the tree");
assert.match(result.before.inspector,/Time is the\s*real horsepower/i);
assert.equal(result.before.toolbar.theme,"Heuristic");
assert.equal(result.before.toolbar.legacyTabs,0);
assert.equal(result.before.toolbar.themeTrigger,true);
assert.equal(result.before.toolbar.pageVisible,true);
assert.equal(result.before.toolbar.menuOpened,true);
assert.equal(result.before.toolbar.options,3);
assert.ok(result.before.blockInspector,"The real collection card must remain selectable");
assert.match(result.before.blockInspector.title,/Collection card/i);
assert.deepEqual(result.before.blockInspector.groups,["Content","Media","Buttons and links"]);
assert.equal(result.before.blockInspector.advancedClosed,true);
assert.ok(result.before.blockInspector.fieldKeys.some(k=>k.endsWith(".href")));
assert.equal(result.before.blockInspector.parentButton,true);
assert.equal(result.before.blockInspector.parentTitle,"Collections");
assert.equal(result.imported.mode,"reconcile");
assert.ok(result.imported.sections.some(s=>s.key==="hero" && /Time is the\s*real horsepower/i.test(s.content.headline)));
assert.ok(!result.imported.sections.some(s=>s.key==="newsletter"));
const cards = result.imported.sections.find(s => s.key === "collections").content;
assert.equal(cards.card1.name, "High Octane");
assert.equal(cards.card2.name, "Masters");
assert.equal(cards.card3.name, "Essentials");
assert.equal(result.linked,true);
console.log("PASS: real live Shop content enters the actual CMS editor without production writes");

for(const width of [744,390]){
 const mobile=results.get(width)?.before?.mobile;
 assert.ok(mobile, "Mobile navigation missing at "+width+"px");
 assert.equal(mobile.navVisible,true);
 assert.equal(mobile.initialPreview,true);
 assert.equal(mobile.treeVisible,true, "The section tree must be accessible on tablets and phones");
 assert.equal(mobile.settingsVisible,true, "Selecting a section must open editable settings");
 assert.equal(mobile.backToPreview,true);
 assert.equal(mobile.treeHasAdd,true);
 assert.equal(mobile.noOverflow,true, "Editor must have no horizontal page overflow");
 assert.equal(results.get(width).before.toolbar.legacyTabs,0);
 assert.equal(results.get(width).before.toolbar.pageVisible,true);
 assert.equal(results.get(width).before.toolbar.menuOpened,true);
 assert.equal(results.get(width).linked,true);
 console.log("PASS: "+width+"px mobile CMS Sections / Preview / Settings editor");
}
