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
const html='<!doctype html><html><head><style>main{display:grid;grid-template-columns:minmax(160px,1fr) minmax(140px,300px);gap:8px}#left{grid-column:1;min-width:0}#assistant{grid-column:2;min-width:0}#composer-slot{min-width:0}</style></head><body>' +
 '<main><div id="left"><div id="tree"></div><div id="panel" hidden></div><div id="inspector"></div><div id="composer-slot"></div></div>' +
 '<aside id="assistant"><div id="messages"></div></aside></main>' +
 '<script src="/js/agentsam-composer.js"></script><script src="/js/miniagentsam-codepreview.js"></script><script type="module">' +
 'import {createGenerationFlow,mountComposer} from "/js/generation-surfaces.mjs";' +
 'let accepted=0;const panel=document.getElementById("panel");' +
 'const flow=createGenerationFlow({assistant:document.getElementById("assistant"),messages:document.getElementById("messages"),' +
 'panel,tree:document.getElementById("tree"),inspector:document.getElementById("inspector")});' +
 'let requests=0;panel.addEventListener("agentsam-generation-request",()=>requests++);' +
 'const composer=mountComposer(document.getElementById("composer-slot"),"editor");' +
 'composer.addEventListener("submit-request",event=>flow.handoff(event.detail.text));' +
 'composer.shadowRoot.querySelector("[data-input]").value="Create an editorial section";' +
 'composer.shadowRoot.querySelector("[data-send]").click();' +
 'const action=document.querySelector("#messages [data-action-card]");' +
 'const handoff={requests,action:!!action,user:!!document.querySelector("#messages .agentsam-msg--user"),' +
 'plan:!!document.querySelector("#messages .agentsam-msg--assistant"),treeBefore:!document.querySelector("#tree [data-generating]"),' +
 'hiddenBefore:panel.hidden,slotWidth:document.getElementById("composer-slot").clientWidth,' +
 'composerWidth:composer.getBoundingClientRect().width};' +
 'action.click();const request=panel.querySelector("[data-request-box]");request.value="Revised editorial section";' +
 'const edit={editable:request.value,requests,placeholder:!!document.querySelector("#tree [data-generating]")};' +
 'panel.querySelector("[data-send-request]").click();' +
 'const started={requests,sent:flow.state.request,stage:panel.dataset.panelState,' +
 'side:panel.closest("#left")!==null,assistantRight:document.getElementById("assistant").getBoundingClientRect().left>=panel.getBoundingClientRect().left};' +
 'const activePreview=panel.querySelector("miniagentsam-codepreview");' +
 'flow.review(' + JSON.stringify(generated) + ',async()=>{accepted++;return {ok:true};});' +
 'const widget=activePreview;widget.appendText(' + JSON.stringify(['<section class="demo">','{{ headline }}','/* note */','a {','  padding: 1px;','}'].concat(Array.from({length:23},(_,i)=>'<div id="row">'+i+'</div>')).join("\n")) + ');' +
 'const livePre=widget.shadowRoot.querySelector("pre");' +
 'const codeStats={visibleLines:livePre.clientHeight/parseFloat(getComputedStyle(livePre).lineHeight),' +
 'contentLines:livePre.textContent.split("\\n").length,' +
 'colored:["tag","attr","string","template","prop","comment"].every(role=>!!livePre.querySelector(".token-"+role))};' +
 'setTimeout(()=>{const iframe=panel.querySelector("iframe"),accept=panel.querySelector("[data-accept-generated]");' +
 'const before={accepted,button:!!accept,sandbox:iframe?.getAttribute("sandbox"),srcdoc:iframe?.srcdoc.includes("Review before installing"),stage:panel.dataset.panelState};' +
 'accept?.click();setTimeout(()=>{const pre=document.createElement("pre");pre.id="generated-approval-proof";' +
 'pre.textContent=JSON.stringify({handoff,edit,started,before,after:{accepted,stage:panel.dataset.panelState,message:panel.textContent},codeStats});document.body.append(pre);},250);},250);' +
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
 for(const width of [390,744,1440]) {
 const {stdout:dom}=await exec(chrome,["--headless=new","--disable-gpu","--no-sandbox","--disable-dev-shm-usage",
   "--virtual-time-budget=3500","--window-size="+width+",900","--dump-dom","http://127.0.0.1:"+server.address().port+"/"],
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
 assert.deepEqual({requests:proof.handoff.requests,action:proof.handoff.action,user:proof.handoff.user,plan:proof.handoff.plan,treeBefore:proof.handoff.treeBefore,hiddenBefore:proof.handoff.hiddenBefore},
  {requests:0,action:true,user:true,plan:true,treeBefore:true,hiddenBefore:true});
 assert.ok(proof.handoff.composerWidth<=proof.handoff.slotWidth+1,"Composer input must not overflow its slot");
 assert.deepEqual(proof.edit,{editable:"Revised editorial section",requests:0,placeholder:true});
 assert.deepEqual(proof.started,{requests:1,sent:"Revised editorial section",stage:"generating",side:true,assistantRight:true});
 assert.match(proof.after.message,/private draft/i);
 console.log("PASS "+width+"px: mini composer→right action card→left editable request→stream→private acceptance");
 }
}finally{server.close();}
