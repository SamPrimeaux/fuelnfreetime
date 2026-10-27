import assert from "node:assert/strict";
import test from "node:test";
import http from "node:http";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const chrome = [
  "/usr/bin/google-chrome", "/usr/bin/chromium", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].find(existsSync);

test("browser crop + rotate + flip + PNG save + removal controls run without JS errors", { timeout: 40_000 }, async (t) => {
  if (!chrome) return t.skip("Chrome unavailable on this host");
  const html = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/style.css">
    <script>window.__errors=[];window.addEventListener('error', e=>window.__errors.push(e.message));
      window.addEventListener('unhandledrejection', e=>window.__errors.push(String(e.reason)));</script>
    </head><body><div id="host"></div><script type="module">
    import { createMediaAssetWorkbench } from "/editor.js";
    const source={ id:823, filename:"source.png", content_type:"image/png", url:"/image.svg",
      meta:{ review_notes:[] } };
    window.__saved=null; window.__removed=0;
    const workbench=createMediaAssetWorkbench({
      mount:document.getElementById("host"), imageUrl:()=>"/image.svg",
      addComment:async()=>({asset:source}), removeBackground:async()=>{window.__removed++;return {ok:true};},
      saveDerivative:async({file,operations,width,height})=>{
        window.__saved={type:file.type,size:file.size,width,height,operations};return {ok:true};
      }
    });
    workbench.setAsset(source,{backgroundRemoval:true});
    window.__mounted=true;
    </script></body></html>`;
  const server=http.createServer((req,res)=>{
    const p=new URL(req.url,"http://127.0.0.1").pathname;
    if(p==="/")return res.writeHead(200,{"content-type":"text/html"}).end(html);
    if(p==="/editor.js")return res.writeHead(200,{"content-type":"text/javascript"}).end(
      readFileSync(path.join(root,"apps/ecommerce-cms-agentsam/packages/agentsam-workbench/src/media-asset-workbench.js")));
    if(p==="/style.css")return res.writeHead(200,{"content-type":"text/css"}).end(
      readFileSync(path.join(root,"apps/ecommerce-cms-agentsam/frontend/static/css/media-library.css")));
    if(p==="/image.svg")return res.writeHead(200,{"content-type":"image/svg+xml"}).end(
      '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect width="200" height="100" fill="#427e64"/><circle cx="40" cy="50" r="24" fill="#f93"/></svg>');
    res.writeHead(404).end();
  });
  await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
  const portServer=http.createServer();
  await new Promise(resolve=>portServer.listen(0,"127.0.0.1",resolve));
  const port=portServer.address().port;
  await new Promise(resolve=>portServer.close(resolve));
  const dataDir=mkdtempSync(path.join(tmpdir(),"fnf-workbench-transform-"));
  const browser=spawn(chrome,[
    "--headless=new","--no-first-run","--no-sandbox","--disable-gpu","--disable-dev-shm-usage",
    "--remote-debugging-port="+port,"--remote-allow-origins=*","--user-data-dir="+dataDir,"about:blank",
  ],{stdio:"ignore"});
  let socket;
  try {
    let target;
    for(let i=0;i<80&&!target;i++){
      await new Promise(r=>setTimeout(r,100));
      try { target=(await (await fetch("http://127.0.0.1:"+port+"/json")).json()).find(item=>item.type==="page"); }
      catch {}
    }
    assert.ok(target?.webSocketDebuggerUrl,"Chrome CDP failed to start");
    socket=new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve,reject)=>{
      socket.addEventListener("open",resolve,{once:true});socket.addEventListener("error",reject,{once:true});
    });
    let seq=0;const pending=new Map();
    socket.addEventListener("message",({data})=>{
      const message=JSON.parse(data);const entry=pending.get(message.id);
      if(!entry)return;
      pending.delete(message.id);
      message.error?entry.reject(new Error(message.error.message)):entry.resolve(message.result||{});
    });
    const send=(method,params={})=>new Promise((resolve,reject)=>{
      const id=++seq;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));
    });
    const evalJS=async expression=>{
      const output=await send("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true});
      if(output.exceptionDetails)throw new Error(JSON.stringify(output.exceptionDetails));
      return output.result?.value;
    };
    const until=async(expression)=>{
      for(let i=0;i<70;i++){
        const result=await evalJS(expression);
        if(result)return result;
        await new Promise(r=>setTimeout(r,90));
      }
      throw new Error("Browser condition never became true: "+expression);
    };
    await send("Page.enable");await send("Runtime.enable");
    await send("Page.navigate",{url:"http://127.0.0.1:"+server.address().port+"/"});
    await until("window.__mounted===true");
    await evalJS('document.querySelector("[data-media-tool=crop]").click();true');
    await until('document.querySelector(".media-agent-editor canvas")?.width===200');
    const cropped=await evalJS(`(()=>{
      const form=document.querySelector(".media-agent-crop-form");
      Object.assign(form.elements.x,{value:"10"}); Object.assign(form.elements.y,{value:"20"});
      Object.assign(form.elements.width,{value:"80"}); Object.assign(form.elements.height,{value:"50"});
      form.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));
      const canvas=document.querySelector(".media-agent-editor canvas");
      return {w:canvas.width,h:canvas.height,pinsHidden:document.querySelector(".media-agent-pins").hidden};
    })()`);
    assert.deepEqual(cropped,{w:80,h:50,pinsHidden:true});
    const rotated=await evalJS(`(()=>{
      document.querySelector('[data-editor-transform="rotate-right"]').click();
      const canvas=document.querySelector(".media-agent-editor canvas");
      return [canvas.width,canvas.height];
    })()`);
    assert.deepEqual(rotated,[50,80]);
    await evalJS('document.querySelector(\'[data-editor-transform="flip-horizontal"]\').click();true');
    await evalJS('document.querySelector(\'[data-editor-action="save"]\').click();true');
    const saved=await until("window.__saved");
    assert.equal(saved.type,"image/png");
    assert.ok(saved.size>80);
    assert.deepEqual([saved.width,saved.height],[50,80]);
    assert.deepEqual(saved.operations.filter(x=>["crop","rotate","flip"].includes(x.type)).map(x=>x.type),["crop","rotate","flip"]);
    await evalJS('document.querySelector(\'[data-media-tool="remove-bg"]\').click();true');
    await until("window.__removed===1");
    assert.deepEqual(await evalJS("window.__errors"),[]);
  }finally{
    try {socket?.close();}catch{}
    browser.kill("SIGTERM");
    await new Promise(resolve=>server.close(resolve));
    rmSync(dataDir,{recursive:true,force:true});
  }
});
