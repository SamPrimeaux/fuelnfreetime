import assert from "node:assert/strict";
import http from "node:http";
import {existsSync,readFileSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {execFile} from "node:child_process";
import {promisify} from "node:util";
const exec=promisify(execFile);
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const scripts=path.join(root,"apps/ecommerce-cms-agentsam/frontend/static/js");
const chrome=["/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium","/usr/bin/chromium-browser",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"].find(existsSync);
assert.ok(chrome,"Chrome required");
const generated={definition:{kind:"section",type:"featured-story",label:"Featured story"},settings:{headline:"Review before installing"},
  canonical:{html:'<section data-agentsam-block="__UID__"><h2 data-cms="headline">Review before installing</h2></section>',
    css:'[data-agentsam-block="__UID__"] h2 { color:#222; }',js:""}};
const html='<!doctype html><html><body><div id="assistant"></div><div id="messages"></div>' +
 '<div id="panel"></div><div id="tree"></div><div id="inspector"></div><script src="/js/miniagentsam-codepreview.js"></script><script type="module">' +
 'import {createGenerationFlow} from "/js/generation-surfaces.mjs";' +
 'let accepted=0;const panel=document.getElementById("panel");' +
 'const flow=createGenerationFlow({assistant:document.getElementById("assistant"),messages:document.getElementById("messages"),' +
 'panel,tree:document.getElementById("tree"),inspector:document.getElementById("inspector")});' +
 'flow.review(' + JSON.stringify(generated) + ',async()=>{accepted++;return {ok:true};});' +
 'const widget=document.createElement("miniagentsam-codepreview");widget.setAttribute("data-lines","13");document.body.append(widget);' +
 'widget.appendText(' + JSON.stringify(['<section class="demo">','{{ headline }}','/* note */','a {','  padding: 1px;','}'].concat(Array.from({length:23},(_,i)=>'<div id="row">'+i+'</div>')).join("\n")) + ');' +
 'const livePre=widget.shadowRoot.querySelector("pre");' +
 'const codeStats={visibleLines:livePre.clientHeight/parseFloat(getComputedStyle(livePre).lineHeight),' +
 'contentLines:livePre.textContent.split("\\n").length,' +
 'colored:["tag","attr","string","template","prop","comment"].every(role=>!!livePre.querySelector(".token-"+role))};' +
 'setTimeout(()=>{const iframe=panel.querySelector("iframe"),accept=panel.querySelector("[data-accept-generated]");' +
 'const before={accepted,button:!!accept,sandbox:iframe?.getAttribute("sandbox"),srcdoc:iframe?.srcdoc.includes("Review before installing"),stage:panel.dataset.panelState};' +
 'accept?.click();setTimeout(()=>{const pre=document.createElement("pre");pre.id="generated-approval-proof";' +
 'pre.textContent=JSON.stringify({before,after:{accepted,stage:panel.dataset.panelState,message:panel.textContent},codeStats});document.body.append(pre);},250);},250);' +
 '</script></body></html>';
const server=http.createServer((req,res)=>{
 const name=new URL(req.url,"http://localhost").pathname;
 if(name==="/")return res.writeHead(200,{"content-type":"text/html"}).end(html);
 if(/^\/js\/[a-z0-9-]+\.(?:mjs|js)$/.test(name)){
   const p=path.join(scripts,name.slice(4));
   if(existsSync(p))return res.writeHead(200,{"content-type":"application/javascript"}).end(readFileSync(p));
 }
 res.writeHead(404).end();
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
try{
 const {stdout:dom}=await exec(chrome,["--headless=new","--disable-gpu","--no-sandbox","--disable-dev-shm-usage",
   "--virtual-time-budget=3500","--dump-dom","http://127.0.0.1:"+server.address().port+"/"],
   {timeout:45000,encoding:"utf8",maxBuffer:1<<20});
 const match=dom.match(/<pre id="generated-approval-proof">([^<]+)<\/pre>/);
 assert.ok(match,"Preview/accept UI did not resolve");
 const proof=JSON.parse(match[1].replaceAll("&quot;",'"').replaceAll("&amp;","&"));
 assert.deepEqual(proof.before,{accepted:0,button:true,sandbox:"",srcdoc:true,stage:"review"});
 assert.equal(proof.after.accepted,1);
 assert.equal(proof.after.stage,"settings");
 assert.ok(proof.codeStats.visibleLines<=13.2,JSON.stringify(proof.codeStats));
 assert.equal(proof.codeStats.contentLines,29);
 assert.equal(proof.codeStats.colored,true);
 assert.match(proof.after.message,/private draft/i);
 console.log("PASS: generation preview is script-disabled and cannot install before explicit acceptance");
}finally{server.close();}
