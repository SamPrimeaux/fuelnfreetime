import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {execFile} from "node:child_process";
import {promisify} from "node:util";
import {build} from "esbuild";

const exec=promisify(execFile);
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const chrome=["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
 "/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium"].find(fs.existsSync);
assert.ok(chrome,"Chrome required for browser acceptance");
const fixture=String.raw`
import React from "react";
import {createRoot} from "react-dom/client";
import {LiveDiagnosticLogs} from "./packages/commerce-analytics/src/live-diagnostic-logs.tsx";
window.__polls=0;window.__asked=null;window.__copied="";
Object.defineProperty(navigator,"clipboard",{configurable:true,value:{writeText:async text=>{window.__copied=text;}}});
const logs=[
 {source:"cloudflare-workers",service:"asset.job",timestamp:"2026-10-08T01:46:30Z",
 severity:"warn",message:"retry attempt 2",requestId:"r-1",rayId:"ray-2",route:"/admin/health",
 status:500,durationMs:14,errorCode:"job_retry",metadata:{attempt:2,job_id:"job-77"}},
 {source:"cloudflare-workers",service:"cms",timestamp:"2026-10-08T01:46:29Z",
 severity:"error",message:"schema failed",requestId:"r-2",rayId:"ray-3",route:"/api/cms",
 status:500,durationMs:11,errorCode:"schema_mismatch",metadata:{}},
];
function query(){window.__polls++;return Promise.resolve({ok:true,logs,source:"Cloudflare Log Explorer"});}
createRoot(document.getElementById("root")).render(React.createElement(LiveDiagnosticLogs,
 {range:"24h",poll:query,onAsk:(selected,context)=>{window.__asked={selected,context};}}));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function run(){
 await sleep(250);
 const initial=window.__polls;
 document.querySelector('[data-logs-running="false"] .card-head button').click();
 await sleep(270);
 const afterStart=window.__polls;
 const rows=[...document.querySelectorAll(".live-log-row")];
 if(rows.length===2){rows[0].click();rows[1].dispatchEvent(new MouseEvent("click",{bubbles:true,shiftKey:true}));}
 await sleep(75);
 const selection=document.querySelectorAll('.live-log-row[aria-pressed="true"]').length;
 const actions=[...document.querySelectorAll('button')];
 actions.find(x=>x.textContent==="Copy"&&!x.closest(".live-log-row-actions"))?.click();
 await sleep(60);
 actions.find(x=>x.textContent==="Ask AgentSam"&&!x.closest(".live-log-row-actions"))?.click();
 document.querySelector('button[aria-label="Stop live logs"]')?.click();
 const stopped=window.__polls;
 await sleep(8700);
 const proof={initial,afterStart,selection,rows:rows.length,
  selectedLogs:window.__asked?.selected?.length||0,contextType:window.__asked?.context?.context_type,
  copied:window.__copied.includes("request_id: r-1")&&window.__copied.includes("request_id: r-2"),
  afterStop:window.__polls,stopped,stoppedLabel:!!document.querySelector('[data-logs-running="false"]')};
 const el=document.createElement("pre");el.id="acceptance-proof";el.textContent=JSON.stringify(proof);document.body.append(el);
}
run();
`;
const bundled=await build({stdin:{contents:fixture,resolveDir:root,sourcefile:"log-fixture.tsx",loader:"tsx"},
 bundle:true,write:false,outdir:"/tmp/fnf-live-logs-browser-build",nodePaths:[path.join(root,"apps/ecommerce-cms-agentsam/frontend/node_modules")],platform:"browser",format:"iife",jsx:"automatic",define:{"process.env.NODE_ENV":'"production"'}});
const js=bundled.outputFiles.find(f=>f.path.endsWith(".js"))?.text||"";
const css=bundled.outputFiles.find(f=>f.path.endsWith(".css"))?.text||"";
assert.ok(js.length,"React widget bundle missing");
const server=http.createServer((req,res)=>{
 const pathname=new URL(req.url,"http://localhost").pathname;
 if(pathname==="/")return res.writeHead(200,{"content-type":"text/html"}).end("<!doctype html><html><head><link rel='stylesheet' href='/app.css'></head><body><div id='root'></div><script src='/app.js'></script></body></html>");
 if(pathname==="/app.js")return res.writeHead(200,{"content-type":"text/javascript"}).end(js);
 if(pathname==="/app.css")return res.writeHead(200,{"content-type":"text/css"}).end(css);
 res.writeHead(404).end();
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
try{
 const url="http://127.0.0.1:"+server.address().port+"/";
 const {stdout:dom}=await exec(chrome,["--headless=new","--disable-gpu","--no-sandbox",
  "--disable-dev-shm-usage","--virtual-time-budget=11000","--window-size=1150,800","--dump-dom",url],
 {encoding:"utf8",timeout:55000,maxBuffer:5<<20});
 const found=dom.match(/<pre id="acceptance-proof">([^<]*)<\/pre>/);
 assert.ok(found,"Mounted React widget never completed the acceptance flow");
 const proof=JSON.parse(found[1].replaceAll("&quot;",'"').replaceAll("&amp;","&"));
 assert.equal(proof.initial,0,"Must not poll until Start is clicked");
 assert.equal(proof.afterStart,1);
 assert.equal(proof.rows,2);
 assert.equal(proof.selection,2,"Shift-selection must select both rows");
 assert.equal(proof.selectedLogs,2);
 assert.equal(proof.contextType,"cloudflare.logs");
 assert.equal(proof.copied,true,"Copy must serialize selected records");
 assert.equal(proof.stoppedLabel,true);
 assert.equal(proof.afterStop,proof.stopped,"Stop must halt all future polls");
 console.log("PASS mounted React DOM: idle → Start → multi-select → Copy → Ask → Stop");
}finally{server.close();}
