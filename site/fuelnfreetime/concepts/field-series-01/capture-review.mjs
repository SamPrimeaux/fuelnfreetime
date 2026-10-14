/** Read-only actual Chrome review: private authored concept page at 390px and 1440px. */
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { setTimeout as pause } from "node:timers/promises";
const chrome="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const profile=path.join(os.tmpdir(),"fnf-field-review-"+process.pid);
const here=path.dirname(new URL(import.meta.url).pathname);
const url="http://127.0.0.1:4338/";
const child=spawn(chrome,["--headless=new","--no-sandbox","--disable-dev-shm-usage",
 "--remote-debugging-port=0","--user-data-dir="+profile,url],{stdio:"ignore"});
try {
 let port;
 for(let i=0;i<100;i++){if(existsSync(path.join(profile,"DevToolsActivePort"))){
    port=Number(readFileSync(path.join(profile,"DevToolsActivePort"),"utf8").split("\n")[0]);break;}
    await pause(130);}
 if(!port)throw Error("Chrome CDP unavailable");
 const tabs=await(await fetch("http://127.0.0.1:"+port+"/json/list")).json();
 const tab=tabs.find(x=>x.type==="page");
 const ws=new WebSocket(tab.webSocketDebuggerUrl);
 await new Promise((res,rej)=>{ws.addEventListener("open",res,{once:true});ws.addEventListener("error",rej,{once:true});});
 let id=0; const pending=new Map();
 ws.addEventListener("message",event=>{const m=JSON.parse(event.data);if(m.id&&pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id);}});
 const send=async(method,params={})=>{const mid=++id,p=new Promise(res=>pending.set(mid,res));ws.send(JSON.stringify({id:mid,method,params}));const reply=await p;if(reply.error)throw Error(reply.error.message);return reply.result;};
 await send("Page.enable");await send("Runtime.enable");
 for(const width of [390,1440]){
   const height=width===390?844:960;
   await send("Emulation.setDeviceMetricsOverride",{width,height,deviceScaleFactor:1,mobile:width===390});
   await send("Page.navigate",{url});await pause(1850);
   const result=(await send("Runtime.evaluate",{expression:`({width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,head:document.querySelector('h1')?.textContent,chapters:document.querySelectorAll('.chapter').length,images:[...document.querySelectorAll('.visual img')].map(x=>({ok:x.complete&&x.naturalWidth>0,width:x.naturalWidth}))})`,returnByValue:true})).result.value;
   console.log(width+"x"+height,JSON.stringify(result));
   if(result.width!==width||result.overflow||result.chapters!==3||result.images.some(x=>!x.ok))throw Error("Concept render gate failed");
   const snap=await send("Page.captureScreenshot",{format:"png",captureBeyondViewport:width===1440,fromSurface:true});
   const file=path.join(here,"review-"+width+".png");writeFileSync(file,Buffer.from(snap.data,"base64"));console.log("Wrote",file);
 }
 ws.close();
}finally{child.kill();await pause(250);rmSync(profile,{recursive:true,force:true});}
