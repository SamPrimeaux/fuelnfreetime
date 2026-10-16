import {spawn} from "node:child_process";
import {readFileSync,existsSync,writeFileSync,mkdirSync,rmSync} from "node:fs";
import path from "node:path";import os from "node:os";import {fileURLToPath} from "node:url";
import {setTimeout as sleep} from "node:timers/promises";
const here=path.dirname(fileURLToPath(import.meta.url));
const cat=JSON.parse(readFileSync(path.join(here,".local-products.json"),"utf8"));
const hood=cat.find(x=>x.product.id===12);
const out=path.join(here,".cart-screenshots");mkdirSync(out,{recursive:true});
const profile=path.join(os.tmpdir(),"fnf-cart-browser-"+process.pid);
const proc=spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
 ["--headless=new","--no-sandbox","--disable-dev-shm-usage","--remote-debugging-port=0","--user-data-dir="+profile,
 "http://127.0.0.1:4350/products/"+hood.product.slug],{stdio:"ignore"});
try{
 let port;
 for(let i=0;i<90;i++){if(existsSync(path.join(profile,"DevToolsActivePort"))){port=Number(readFileSync(path.join(profile,"DevToolsActivePort"),"utf8").split("\n")[0]);break;}await sleep(100);}
 if(!port)throw Error("CDP launch failed");
 const pages=await (await fetch("http://127.0.0.1:"+port+"/json/list")).json(),tab=pages.find(x=>x.type==="page");
 const socket=new WebSocket(tab.webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{socket.addEventListener("open",resolve,{once:true});socket.addEventListener("error",reject,{once:true});});
 let next=0;const pending=new Map();
 socket.addEventListener("message",event=>{const m=JSON.parse(event.data);if(m.id&&pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id);}});
 const send=async(method,params={})=>{const id=++next;const value=new Promise(resolve=>pending.set(id,resolve));socket.send(JSON.stringify({id,method,params}));const r=await value;if(r.error)throw Error(r.error.message);return r.result;};
 const evaluate=async expr=>(await send("Runtime.evaluate",{expression:expr,returnByValue:true,awaitPromise:true})).result.value;
 await send("Page.enable");await send("Runtime.enable");
 for(const width of [390,1440]){
  await send("Emulation.setDeviceMetricsOverride",{width,height:width===390?844:960,deviceScaleFactor:1,mobile:width===390});
  await send("Page.navigate",{url:"http://127.0.0.1:4350/products/"+hood.product.slug});
  await sleep(1800);
  for(let i=0;i<15;i++){if(await evaluate('Boolean(window.FNF_CART_DRAWER && document.querySelector("#pdp-add"))'))break;await sleep(150);}
  if(!(await evaluate('Boolean(window.FNF_CART_DRAWER)')))throw Error("Cart module did not mount");
  await evaluate('window.FNF_STORE.setCart([])');
  const opened=await evaluate(`(()=>{
    document.querySelector("[data-cart-open]").click();
    const d=document.querySelector("#store-cart-drawer-root");
    return {open:d.classList.contains("is-open"),headerFont:getComputedStyle(document.querySelector(".fnf-header")).fontFamily,
      overflows:document.documentElement.scrollWidth>innerWidth,dialog:!!d.querySelector('[role="dialog"]'),
      footer:!!document.querySelector("#fnf-footer-mount footer")};})()`);
  console.log("Empty drawer",width,JSON.stringify(opened));
  if(!opened.open||!opened.dialog||opened.overflows||!opened.footer||!opened.headerFont.includes("Inter"))throw Error("Drawer layout contract failed");
  const item=hood.variants.find(v=>v.color==="Black"&&v.size==="M");
  const added=await evaluate(`(()=>{
    window.FNF_STORE.addItem({variant_id:${item.id},product_id:12,slug:${JSON.stringify(hood.product.slug)},
      title:"Classic Hooded Sweatshirt",color:"Black",size:"M",price_cents:3499,qty:1,
      image:"/media/studio/previews/placement-b525071d-42c42b83-89f02f52-2d4.png"});
    document.querySelector('.drawer-line__qty [data-cart-action="inc"]').click();
    return {qty:document.querySelector(".drawer-line__qty output")?.textContent,
      subtotal:document.querySelector(".drawer-subtotal strong")?.textContent,
      checkout:document.querySelector(".drawer-checkout")?.getAttribute("href"),
      cards:document.querySelectorAll(".drawer-line").length};})()`);
  console.log("Filled drawer",width,JSON.stringify(added));
  if(added.qty!=="2"||added.subtotal!=="$69.98"||added.checkout!=="/checkout"||added.cards!==1)throw Error("Quantity/totals failed");
  const shot=await send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false,fromSurface:true});
  writeFileSync(path.join(out,"cart-"+width+".png"),Buffer.from(shot.data,"base64"));
  await send("Input.dispatchKeyEvent",{type:"keyDown",key:"Escape",code:"Escape"});
  await send("Input.dispatchKeyEvent",{type:"keyUp",key:"Escape",code:"Escape"});
  const closed=await evaluate('!document.querySelector("#store-cart-drawer-root").classList.contains("is-open")');
  if(!closed)throw Error("Escape failed");
  await send("Page.navigate",{url:"http://127.0.0.1:4350/checkout"});await sleep(1200);
  const check=await evaluate(`({heading:document.querySelector(".cart-head h1")?.textContent,
    footer:!!document.querySelector("#fnf-footer-mount footer"),header:!!document.querySelector(".fnf-header"),
    lines:document.querySelectorAll(".cart-line").length,overflows:document.documentElement.scrollWidth>innerWidth,
    processor:document.querySelector(".store-cart-page")?.textContent.includes("Stripe")})`);
  console.log("Checkout",width,JSON.stringify(check));
  if(!check.footer||!check.header||check.lines!==1||check.overflows||check.processor)throw Error("Checkout route quality failed");
 }
 socket.close();
}finally{proc.kill();await sleep(200);rmSync(profile,{recursive:true,force:true});}
