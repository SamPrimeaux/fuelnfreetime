/**
 * Real storefront quality gate: legacy HTML classes, authored layout and
 * motion stay untouched until a merchant chooses a scoped override.
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
const read=p=>readFileSync(path.join(root,p),"utf8");
const chrome=["/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium","/usr/bin/chromium-browser","/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"].find(existsSync);
assert.ok(chrome,"Chromium required");
const original=read("packages/heuristic-theme/storefront/shop.html");
function probeTask(){
 setTimeout(function(){
  const hero=document.querySelector('[data-cms-section="hero"]');
  const title=hero.querySelector('[data-cms="headline"]');
  const cta=hero.querySelector('[data-cms="ctaPrimary.href"]');
  const before={heroClass:hero.className,titleClass:title.className,ctaClass:cta.className,titleStyle:title.getAttribute('style')||'',ctaStyle:cta.getAttribute('style')||'',motion:hero.getAttribute('data-h-motion'),media:hero.querySelector('[data-cms="imageUrl"]').getAttribute('src')};
  const base={key:'hero',content:{headline:'EDITED LEGACY HERO',__editor:{fieldStyles:{
   headline:{fontSize:64,color:'#aa2244',letterSpacing:2,textAlign:'center',paddingLeft:8},
   ctaPrimary:{label:{backgroundColor:'#112233',borderRadius:18}}
  }}}};
  window.postMessage({type:'fnf-cms-preview',slug:'shop',siteSections:[],sections:[base]},location.origin);
  setTimeout(function(){
   const changed={font:title.style.fontSize,color:title.style.color,letterSpacing:title.style.letterSpacing,alignment:title.style.textAlign,padding:title.style.paddingLeft,buttonColor:cta.style.backgroundColor,buttonRadius:cta.style.borderRadius,heroClass:hero.className,titleClass:title.className,ctaClass:cta.className,motion:hero.getAttribute('data-h-motion'),media:hero.querySelector('[data-cms="imageUrl"]').getAttribute('src')};
   window.postMessage({type:'fnf-cms-preview',slug:'shop',siteSections:[],sections:[{key:'hero',content:{headline:'EDITED LEGACY HERO',__editor:{fieldStyles:{}}}}]},location.origin);
   setTimeout(function(){
    const after={titleStyle:title.getAttribute('style')||'',ctaStyle:cta.getAttribute('style')||'',heroClass:hero.className,titleClass:title.className,ctaClass:cta.className,motion:hero.getAttribute('data-h-motion'),media:hero.querySelector('[data-cms="imageUrl"]').getAttribute('src')};
    const out=document.createElement('pre');out.id='legacy-style-result';out.textContent=JSON.stringify({before,changed,after});document.body.append(out);
   },250);
  },250);
 },700);
}
const probe="<script>("+probeTask.toString()+")()</script>";
const html=original.replace("</body>",probe+"</body>");
const server=http.createServer((req,res)=>{
 const p=new URL(req.url||"/","http://localhost").pathname;
 if(p==="/shop")res.writeHead(200,{"content-type":"text/html"}).end(html);
 else if(p==="/js/cms-hydrate.js")res.writeHead(200,{"content-type":"application/javascript"}).end(read("packages/heuristic-theme/storefront/js/cms-hydrate.js"));
 else if(p.startsWith("/api/"))res.writeHead(404,{"content-type":"application/json"}).end('{"error":"no public fixture"}');
 else res.writeHead(404).end();
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
let dom="";
try{
 ({stdout:dom}=await exec(chrome,["--headless=new","--disable-gpu","--disable-dev-shm-usage","--no-sandbox","--virtual-time-budget=4500","--window-size=1200,900","--dump-dom","http://127.0.0.1:"+server.address().port+"/shop"],{timeout:60000,encoding:"utf8",maxBuffer:1<<22}));
}finally{server.close()}
const match=dom.match(/<pre id="legacy-style-result">([^<]+)<\/pre>/);
assert.ok(match,"Timed legacy storefront override probe did not complete");
const result=JSON.parse(match[1].replaceAll("&quot;",'"').replaceAll("&amp;","&").replaceAll("&lt;","<").replaceAll("&gt;",">"));
const {before,changed,after}=result;
assert.equal(changed.font,"64px");
assert.equal(changed.color,"rgb(170, 34, 68)");
assert.equal(changed.letterSpacing,"2px");
assert.equal(changed.alignment,"center");
assert.equal(changed.padding,"8px");
assert.equal(changed.buttonColor,"rgb(17, 34, 51)");
assert.equal(changed.buttonRadius,"18px");
for(const property of ["heroClass","titleClass","ctaClass","motion","media"]){
 assert.equal(changed[property],before[property],property+" must remain authored");
 assert.equal(after[property],before[property],property+" must remain authored after reset");
}
assert.equal(after.titleStyle,before.titleStyle,"reset restores original inline typography");
assert.equal(after.ctaStyle,before.ctaStyle,"reset restores original CTA inline styles");
console.log("PASS: actual legacy Shop HTML accepts scoped overrides and restores the authored design");
