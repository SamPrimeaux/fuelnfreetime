/**
 * Browser contract: accepted generated sections mount inside the ONE Heuristic
 * storefront runtime, and private preview messages revise the same instance.
 * No production calls or deployment.
 */
import assert from "node:assert/strict";
import http from "node:http";
import { readFileSync,existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec=promisify(execFile);
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const file=(p)=>readFileSync(path.join(root,p),"utf8");
const chrome=["/usr/bin/google-chrome","/usr/bin/google-chrome-stable",
  "/usr/bin/chromium","/usr/bin/chromium-browser",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"].find(existsSync);
assert.ok(chrome,"Chrome is required for generated storefront visual acceptance");

const instance="featured-story-a1b2c3d4";
const implementation={
  html:'<section data-agentsam-block="__UID__" class="__UID__"><p data-cms="eyebrow">Early heading</p><h2 data-cms="headline">Early title</h2></section>',
  css:'[data-agentsam-block="__UID__"] { padding: 24px; } [data-agentsam-block="__UID__"] h2 { color: #fff; }',
  js:"",
};
const makeSection=(headline)=>({
  key:instance,sort_order:80,status:"published",
  content:{eyebrow:"Earned hours",headline,
    __editor:{generated:true,templateKey:"featured-story",definitionKey:"featured-story",artifactId:"cmsa_fixture"}},
  implementation,
});
const page=(headline)=>({ok:true,page:{slug:"shop",status:"published",
  sections:[makeSection(headline)]}});
const probe='<script>setTimeout(function(){' +
  'var generated=document.querySelector(\'[data-cms-section="'+instance+'"]\');' +
  'window.__before={exists:!!generated,headline:generated?.querySelector(\'[data-cms=headline]\')?.textContent,' +
  'scope:generated?.getAttribute("data-agentsam-block"),inMain:!!generated?.closest("main"),' +
  'style:!!document.querySelector(\'[data-cms-generated-style="'+instance+'"]\')};' +
  'window.postMessage({type:"fnf-cms-preview",slug:"shop",sections:' + JSON.stringify([makeSection("Private revised headline")]) +
  '},location.origin);' +
  'setTimeout(function(){var generated=document.querySelector(\'[data-cms-section="'+instance+'"]\');' +
  'var p=document.createElement("pre");p.id="generated-proof";p.textContent=JSON.stringify({before:window.__before,' +
  'after:{headline:generated?.querySelector(\'[data-cms=headline]\')?.textContent,' +
  'scope:generated?.getAttribute("data-agentsam-block"),count:document.querySelectorAll(\'[data-cms-section="'+instance+'"]\').length,' +
  'styles:document.querySelectorAll(\'[data-cms-generated-style="'+instance+'"]\').length}});document.body.append(p);},300);' +
  '},700)</script>';
const html=file("packages/heuristic-theme/storefront/shop.html").replace("</body>",probe+"</body>");
const server=http.createServer((request,response)=>{
  const pathname=new URL(request.url,"http://localhost").pathname;
  if(pathname==="/shop") response.writeHead(200,{"content-type":"text/html"}).end(html);
  else if(pathname==="/api/cms/pages/shop") response.writeHead(200,{"content-type":"application/json"}).end(JSON.stringify(page("Published generated title")));
  else if(pathname==="/api/cms/pages/site") response.writeHead(404).end();
  else if(pathname==="/js/cms-hydrate.js") response.writeHead(200,{"content-type":"application/javascript"}).end(file("packages/heuristic-theme/storefront/js/cms-hydrate.js"));
  else if(pathname==="/js/portable-sections.js") response.writeHead(200,{"content-type":"application/javascript"}).end("window.ThemePortableSections={};export {};");
  else response.writeHead(404).end();
});
await new Promise((resolve)=>server.listen(0,"127.0.0.1",resolve));
try{
  const url="http://127.0.0.1:"+server.address().port+"/shop";
  for(const width of [1440,390]){
    const {stdout:dom}=await exec(chrome,["--headless=new","--no-sandbox","--disable-gpu","--disable-dev-shm-usage",
      "--virtual-time-budget=5000","--window-size="+width+",920","--dump-dom",url],
      {timeout:45000,maxBuffer:4<<20,encoding:"utf8"});
    const match=dom.match(/<pre id="generated-proof">([^<]+)<\/pre>/);
    assert.ok(match,"Generated renderer did not complete at "+width+"px");
    const result=JSON.parse(match[1].replaceAll("&quot;",'"').replaceAll("&amp;","&"));
    assert.deepEqual(result.before,{exists:true,headline:"Published generated title",scope:instance,inMain:true,style:true});
    assert.deepEqual(result.after,{headline:"Private revised headline",scope:instance,count:1,styles:1});
    console.log("PASS: "+width+"px accepted generated section + private preview share the canonical storefront renderer");
  }
}finally{server.close();}
