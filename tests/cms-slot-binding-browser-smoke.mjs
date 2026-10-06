/**
 * Customer acceptance: editable Shop media, CTA text, links and collection
 * cards must update the ACTUAL Heuristic storefront DOM, not just an iframe
 * label or an alternate mock preview.
 */
import assert from "node:assert/strict";
import http from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import path from "node:path";

const exec=promisify(execFile);
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const file=p=>readFileSync(path.join(root,p),"utf8");
const chrome=["/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium",
 "/usr/bin/chromium-browser","/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"].find(existsSync);
assert.ok(chrome,"Real Chrome required");

const html=file("packages/heuristic-theme/storefront/shop.html");
const probe="<script>setTimeout(function(){" +
 "window.postMessage({type:'fnf-cms-preview',slug:'shop',siteSections:[],sections:[" +
 "{key:'hero',content:{headline:'CUSTOMER EDITED HEADLINE',imageUrl:'/media/customer-hero.webp'," +
 "ctaPrimary:{label:'Explore the drop',href:'/shop/collections/updated'},ctaSecondary:{label:'Our Story',href:'/about'}}}," +
 "{key:'collections',content:{title:'Customer Collections',card1:{name:'CUSTOM COLLECTION',imageUrl:'/media/customer-card.webp',href:'/shop/collections/custom'}}}," +
 "{key:'stories',content:{imageUrl:'/media/customer-story.webp'}}" +
 "]},location.origin);" +
 "setTimeout(function(){" +
 "var hero=document.querySelector('.shop-hero');" +
 "var result={headline:hero.querySelector('[data-cms=\"headline\"]').textContent," +
 "image:hero.querySelector('[data-cms=\"imageUrl\"]').getAttribute('src')," +
 "primaryHref:hero.querySelector('[data-cms=\"ctaPrimary.href\"]').getAttribute('href')," +
 "primaryLabel:hero.querySelector('[data-cms=\"ctaPrimary.label\"]').textContent," +
 "arrow:hero.querySelector('[aria-hidden=\"true\"]')?.textContent," +
 "secondaryHref:hero.querySelector('[data-cms=\"ctaSecondary.href\"]').getAttribute('href')," +
 "collectionTitle:document.querySelector('.collection-lineup [data-cms=\"title\"]').textContent," +
 "cardName:document.querySelector('.collection-lineup [data-cms=\"card1.name\"]').textContent," +
 "cardImage:document.querySelector('.collection-lineup [data-cms=\"card1.imageUrl\"]').getAttribute('src')," +
 "cardHref:document.querySelector('.collection-lineup [data-cms=\"card1.href\"]').getAttribute('href')," +
 "storyImage:document.querySelector('.brand-story [data-cms=\"imageUrl\"]').getAttribute('src')};" +
 "var out=document.createElement('pre');out.id='browser-result';out.textContent=JSON.stringify(result);document.body.append(out);" +
 "},400);},800)</script>";
const storefront=html.replace("</body>",probe+"</body>");
const server=http.createServer((req,res)=>{
 const p=new URL(req.url||"/","http://localhost").pathname;
 if(p==="/shop")res.writeHead(200,{"content-type":"text/html"}).end(storefront);
 else if(p==="/js/cms-hydrate.js")res.writeHead(200,{"content-type":"application/javascript"})
  .end(file("packages/heuristic-theme/storefront/js/cms-hydrate.js"));
 else if(p.startsWith("/api/"))res.writeHead(404,{"content-type":"application/json"}).end('{"error":"not published"}');
 else res.writeHead(404).end();
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
let dom;
try{
 const url="http://127.0.0.1:"+server.address().port+"/shop";
 ({stdout:dom}=await exec(chrome,["--headless=new","--disable-gpu","--disable-dev-shm-usage","--no-sandbox",
  "--virtual-time-budget=4000","--window-size=1200,900","--dump-dom",url],
  {timeout:60000,encoding:"utf8",maxBuffer:1<<22}));
}finally{server.close()}
const match=dom.match(/<pre id="browser-result">([^<]+)<\/pre>/);
assert.ok(match,"CMS hydration never completed in Chrome");
const result=JSON.parse(match[1].replaceAll("&quot;",'"').replaceAll("&amp;","&").replaceAll("&lt;","<").replaceAll("&gt;",">"));
console.log(JSON.stringify(result,null,2));
assert.equal(result.headline,"CUSTOMER EDITED HEADLINE");
assert.equal(result.image,"/media/customer-hero.webp");
assert.equal(result.primaryHref,"/shop/collections/updated");
assert.equal(result.primaryLabel,"Explore the drop");
assert.match(result.arrow||"",/→/,"editable CTA label must not erase its icon");
assert.equal(result.secondaryHref,"/about");
assert.equal(result.collectionTitle,"Customer Collections");
assert.equal(result.cardName,"CUSTOM COLLECTION");
assert.equal(result.cardImage,"/media/customer-card.webp");
assert.equal(result.cardHref,"/shop/collections/custom");
assert.equal(result.storyImage,"/media/customer-story.webp");
console.log("PASS: real Heuristic storefront applies actual CMS content, media and link edits");
