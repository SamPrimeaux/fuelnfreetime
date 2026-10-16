/**
 * Click-through smoke for the REAL Side Assistant composer and shared + menu.
 * No source-string assertions: Chromium executes the production JS and sends
 * multipart uploads/chat requests to an in-page test backend.
 *
 * Run: node tests/agentsam-composer-p0-browser.test.mjs
 */
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";

const exec = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assets = path.join(root, "apps/ecommerce-cms-agentsam/frontend/static");
const chrome = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].find(existsSync);
if (!chrome) {
  console.log("SKIP: Chromium unavailable — browser acceptance must run before release.");
  process.exit(0);
}
const fixture = String.raw`<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<script>
  const proof = { checks: {}, errors: [], uploads: [], sends: [] };
  let failUpload = true, delayChat = false;
  window.fetch = async (url, opts={}) => {
    const p=String(url);
    if(p.includes("/files/upload")) {
      const file=opts.body.get("file");
      proof.uploads.push({name:file.name,size:file.size,type:file.type});
      if(file.name==="fail.png" && failUpload) return Response.json({error:"Storage unavailable"},{status:503});
      return Response.json({ok:true,attachment_id:"att_test_"+proof.uploads.length,
        file_name:file.name,mime_type:file.type,file_size_bytes:file.size,
        preview_url:"/media/test/"+encodeURIComponent(file.name)});
    }
    if(p.includes("/agentsam/chat")) {
      const body=JSON.parse(opts.body);
      proof.sends.push(body);
      if(delayChat) await new Promise(resolve=>setTimeout(resolve,150));
      return Response.json({ok:true,conversation_id:"conv_test",reply:"Image received"});
    }
    return Response.json({ok:true,bound:false,mcp_servers:[]});
  };
</script>
<script defer src="/admin/js/agent-composer-menu.js"></script>
<script defer src="/admin/js/agentsam.js"></script></head><body>
<div id="agentsam-dock"></div>
<pre id="out">WAITING</pre>
<script>
const sleep = ms=>new Promise(resolve=>setTimeout(resolve,ms));
const assertCheck = (name, ok)=>{proof.checks[name]=!!ok;};
const png = (name="screen.png")=>new File([new Uint8Array([137,80,78,71,13,10,26,10])],name,{type:"image/png"});
function pasteImage(input, file) {
  const transfer=new DataTransfer();transfer.items.add(file);
  const event=new ClipboardEvent("paste",{clipboardData:transfer,bubbles:true,cancelable:true});
  input.dispatchEvent(event);
  return event;
}
async function run() {
 try {
  window.initAgentsamDrawer();
  window.openAgentsamDrawer();
  const input=document.getElementById("agentsam-input");
  const form=document.getElementById("agentsam-form");
  await sleep(80);
  assertCheck("real menu mounted",!!window.AgentSamComposerMenu && document.getElementById("agentsam-plus").dataset.agentMenuWired==="1");

  input.value="Keyboard submit";
  input.dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:true,cancelable:true}));
  await sleep(100);
  assertCheck("Enter sends exactly once",proof.sends.length===1&&proof.sends[0].message==="Keyboard submit");
  assertCheck("successful send clears text",input.value==="");

  input.value="A draft";
  const shift=new KeyboardEvent("keydown",{key:"Enter",shiftKey:true,bubbles:true,cancelable:true});
  input.dispatchEvent(shift);
  assertCheck("Shift Enter leaves newline handling to browser",!shift.defaultPrevented&&proof.sends.length===1);
  const ime=new KeyboardEvent("keydown",{key:"Enter",isComposing:true,bubbles:true,cancelable:true});
  input.dispatchEvent(ime);
  assertCheck("IME Enter does not send",!ime.defaultPrevented&&proof.sends.length===1);
  const textPaste=new ClipboardEvent("paste",{clipboardData:new DataTransfer(),bubbles:true,cancelable:true});
  input.dispatchEvent(textPaste);
  assertCheck("ordinary text paste not intercepted",!textPaste.defaultPrevented);

  input.value="";
  const clipboard=pasteImage(input,png());
  await sleep(100);
  assertCheck("screenshot paste accepted",clipboard.defaultPrevented&&proof.uploads.some(a=>a.name==="screen.png"));
  assertCheck("pasted screenshot thumbnail visible",!!form.querySelector(".asm-attachment-thumbnail"));
  input.dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:true,cancelable:true}));
  await sleep(100);
  assertCheck("image-only message sent once",proof.sends.length===2&&proof.sends[1].message===""
    &&proof.sends[1].attachments?.[0]?.attachment_id?.startsWith("att_test_"));
  assertCheck("no base64 in chat transport",!proof.sends[1].attachments?.[0]?.image_base64);
  assertCheck("message retains image reference",!!document.querySelector(".agentsam-message-attachments img"));
  assertCheck("sent draft cleared",window.AgentSamDraft.attachments.length===0);

  const transfer=new DataTransfer();transfer.items.add(png("drag.png"));
  form.dispatchEvent(new DragEvent("drop",{dataTransfer:transfer,bubbles:true,cancelable:true}));
  await sleep(100);
  assertCheck("drag drop same pipeline",proof.uploads.some(a=>a.name==="drag.png"));

  const picker=form.querySelector('input[type="file"]');
  const chosen=new DataTransfer();chosen.items.add(png("picker.png"));
  Object.defineProperty(picker,"files",{configurable:true,value:chosen.files});
  picker.dispatchEvent(new Event("change",{bubbles:true}));
  await sleep(100);
  assertCheck("file picker same pipeline",proof.uploads.some(a=>a.name==="picker.png")&&window.AgentSamDraft.attachments.length===2);
  window.AgentSamComposerMenu.clearFiles();

  pasteImage(input,png("fail.png"));
  await sleep(90);
  assertCheck("upload failure preserves draft",window.AgentSamDraft.attachments.length===1&&!!window.AgentSamDraft.attachments[0].error);
  input.value="retry";
  form.requestSubmit();
  await sleep(50);
  assertCheck("failed upload blocks model request",proof.sends.length===2&&input.value==="retry");
  failUpload=false;
  form.querySelector('button[aria-label="Retry upload of fail.png"]')?.click();
  await sleep(100);
  assertCheck("retry gets valid R2 reference",!!window.AgentSamDraft.attachments[0].attachment_id);
  form.requestSubmit();
  await sleep(100);
  assertCheck("retry sends and clears",proof.sends.length===3&&window.AgentSamDraft.attachments.length===0);

  delayChat=true; input.value="Only once";
  input.dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:true,cancelable:true}));
  input.dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",bubbles:true,cancelable:true}));
  await sleep(220);
  assertCheck("inflight Enter cannot double send",proof.sends.filter(a=>a.message==="Only once").length===1);
  assertCheck("side/focus share same composer",document.getElementById("agentsam-input")===input);
  window.focusAgentsamDrawer();
  assertCheck("focus mode preserves composer",document.getElementById("agentsam-input")===input);
 } catch(error) {proof.errors.push(String(error?.stack||error));}
 document.getElementById("out").textContent="AGENTSAM_P0_PROOF:"+JSON.stringify(proof);
}
document.addEventListener("DOMContentLoaded",()=>{void run();},{once:true});
</script></body></html>`;
const server = createServer((req,res)=>{
  const u=new URL(req.url,"http://localhost");
  if(u.pathname==="/"){res.writeHead(200,{"content-type":"text/html"});res.end(fixture);return;}
  const map={
    "/admin/js/agentsam.js":"js/agentsam.js",
    "/admin/js/agent-composer-menu.js":"js/agent-composer-menu.js"
  };
  const f=map[u.pathname];
  if(!f){res.writeHead(404);res.end("not found");return;}
  res.writeHead(200,{"content-type":"text/javascript"});res.end(readFileSync(path.join(assets,f)));
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
try {
  const url="http://127.0.0.1:"+server.address().port+"/";
  const {stdout}=await exec(chrome,["--headless=new","--no-sandbox","--disable-gpu",
    "--disable-dev-shm-usage","--disable-background-networking","--virtual-time-budget=5500",
    "--window-size=1100,820","--dump-dom",url],{timeout:45000,maxBuffer:8*1024*1024});
  const match=stdout.match(/AGENTSAM_P0_PROOF:({[^<]+})/);
  assert.ok(match,"No browser behavior proof returned");
  const proof=JSON.parse(match[1].replaceAll("&quot;",'"').replaceAll("&amp;","&"));
  for(const [key,ok] of Object.entries(proof.checks))console.log((ok?"PASS ":"FAIL ")+key);
  if(proof.errors.length)console.error(proof.errors.join("\n"));
  assert.deepEqual(proof.errors,[],"Browser behavior failed");
  assert.ok(Object.keys(proof.checks).length>=16,"Insufficient acceptance coverage");
  assert.deepEqual(Object.entries(proof.checks).filter(([,v])=>!v),[],"Behavioral failures");
} finally {server.close();}
