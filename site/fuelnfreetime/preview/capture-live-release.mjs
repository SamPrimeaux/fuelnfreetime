import { spawn } from "node:child_process";
import { readFileSync,existsSync,writeFileSync,mkdirSync,rmSync } from "node:fs";
import os from "node:os";import path from "node:path";
import { fileURLToPath } from "node:url";
import {setTimeout as pause} from "node:timers/promises";
const root=path.dirname(fileURLToPath(import.meta.url));
const catalog=JSON.parse(readFileSync(path.join(root,".local-products.json"),"utf8"));
const urls=[12,10,6].map(id=>"/products/"+catalog.find(x=>x.product.id===id).product.slug);
const out=path.join(root,".screenshots-live");mkdirSync(out,{recursive:true});
const profile=path.join(os.tmpdir(),"fnf-pdp-test-"+process.pid);
const child=spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
 ["--headless=new","--no-sandbox","--disable-dev-shm-usage","--remote-debugging-port=0","--user-data-dir="+profile,
 "https://fuelnfreetime.com"+urls[0]],{stdio:"ignore"});
try{
 let port;
 for(let i=0;i<100;i++){if(existsSync(path.join(profile,"DevToolsActivePort"))){
   port=Number(readFileSync(path.join(profile,"DevToolsActivePort"),"utf8").split("\n")[0]);break;
 }await pause(120);}
 if(!port)throw Error("Chrome CDP unavailable");
 const pages=await(await fetch("http://127.0.0.1:"+port+"/json/list")).json();
 const tab=pages.find(p=>p.type==="page");const ws=new WebSocket(tab.webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{ws.addEventListener("open",resolve,{once:true});ws.addEventListener("error",reject,{once:true});});
 let next=0;const pending=new Map();
 ws.addEventListener("message",event=>{const m=JSON.parse(event.data);if(m.id&&pending.has(m.id)){pending.get(m.id)(m);pending.delete(m.id);}});
 const send=async(method,params={})=>{const id=++next,task=new Promise(resolve=>pending.set(id,resolve));
   ws.send(JSON.stringify({id,method,params}));const reply=await task;if(reply.error)throw Error(reply.error.message);return reply.result;};
 const evalValue=async expression=>(await send("Runtime.evaluate",{expression,returnByValue:true})).result.value;
 await send("Page.enable");await send("Runtime.enable");
 for(const width of [390,834,1440]){
  const height=width===390?844:width===834?1112:960;
  await send("Emulation.setDeviceMetricsOverride",{width,height,deviceScaleFactor:1,mobile:width<900});
  await send("Page.navigate",{url:"https://fuelnfreetime.com"+urls[0]});await pause(1400);
  for(let retry=0;retry<22;retry++){
    if(await evalValue('document.querySelector(".pdp-main img")?.naturalWidth > 0'))break;
    await pause(320);
  }
  const x=await evalValue(`({width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth,
    title:document.querySelector(".pdp-buy h1")?.textContent,
    colors:document.querySelectorAll("[data-color]").length,sizes:document.querySelectorAll("[data-size]").length,
    related:document.querySelectorAll(".pdp-related-card").length,
    stripeMention:document.querySelector(".pdp-page")?.textContent?.includes("Stripe")||false,
    imageLoaded:document.querySelector(".pdp-main img")?.naturalWidth>0,
    header:!!document.querySelector("header.fnf-header .fnf-primary"),
    headerPreset:document.querySelector("header.fnf-header")?.dataset.headerPreset,
    footer:!!document.querySelector("#fnf-footer-mount footer.fnf-footer"),
    footerLinks:document.querySelectorAll("#fnf-footer-mount .fnf-footer-nav a").length})`);
  console.log("Hoodie",width,JSON.stringify(x));
  if(x.width!==width||x.overflow||x.colors!==15||x.sizes!==6||x.related<2||x.stripeMention||!x.imageLoaded||!x.header||x.headerPreset!=="frost-pill"||!x.footer||x.footerLinks<4)throw Error("PDP/header/footer gate "+width);
  const image=await send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false,fromSurface:true});
  writeFileSync(path.join(out,"hoodie-"+width+".png"),Buffer.from(image.data,"base64"));
  if(width===390 || width===1440){
    await evalValue('window.scrollTo(0, document.documentElement.scrollHeight)');
    await pause(500);
    const footerCapture=await send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false,fromSurface:true});
    writeFileSync(path.join(out,"footer-"+width+".png"),Buffer.from(footerCapture.data,"base64"));
    await evalValue('window.scrollTo(0,0)');
  }
  if(width===390){
    const initialSizes=await evalValue('document.querySelectorAll("[data-size]:not(:disabled)").length');
    if(initialSizes!==6)throw Error("Sizes should be selectable before color");
    const action=await evalValue(`(()=>{
      document.querySelector('[data-color="Ash"]').click();
      document.querySelector('[data-size="M"]').click();
      return {color:document.querySelector("#pdp-color-current").textContent,
        size:document.querySelector("#pdp-size-current").textContent,
        selectedColor:document.querySelector('.pdp-color.active')?.dataset.color,
        selectedSize:document.querySelector('.pdp-size.active')?.dataset.size,
        buttonDisabled:document.querySelector("#pdp-add").disabled,
        image:document.querySelector(".pdp-main img")?.getAttribute("src"),
        source:document.querySelector(".pdp-image-reference")?.textContent};})()`);
    console.log("Swatch interaction",JSON.stringify(action));
    if(action.color!=="Ash"||action.size!=="M"||action.buttonDisabled||!action.source)throw Error("Swatch selection failed");
    for(let tries=0;tries<12;tries++){
      if(await evalValue('document.querySelector(".pdp-main img")?.naturalWidth > 0'))break;
      await pause(240);
    }
    if(!(await evalValue('document.querySelector(".pdp-main img")?.naturalWidth > 0')))throw Error("Supplier color image did not load");
    const screenshot=await send("Page.captureScreenshot",{format:"png",captureBeyondViewport:false,fromSurface:true});
    const expected=catalog.find(x=>x.product.id===12).variants.find(v=>v.color==="Ash"&&v.size==="M").id;
    const saved=await evalValue(`(()=>{
      document.querySelector("#pdp-add").click();
      return window.FNF_STORE?.getCart()?.map(x=>({id:x.variant_id,color:x.color,size:x.size}));
    })()`);
    console.log("Bag selection",JSON.stringify(saved));
    if(!saved?.some(x=>x.id===expected&&x.color==="Ash"&&x.size==="M"))
      throw Error("Wrong local variant ID added to bag");
    writeFileSync(path.join(out,"hoodie-color-ash-390.png"),Buffer.from(screenshot.data,"base64"));
    await send("Page.navigate",{url:"https://fuelnfreetime.com"+urls[2]});await pause(1350);
    const hat=await evalValue(`({sizes:document.querySelectorAll("[data-size]").length,
      colors:document.querySelectorAll("[data-color]").length,
      disabled:document.querySelector("#pdp-add")?.disabled,title:document.querySelector(".pdp-buy h1")?.textContent,
      overflow:document.documentElement.scrollWidth>innerWidth})`);
    console.log("Hat",JSON.stringify(hat));
    if(hat.sizes!==0||hat.colors!==0||!hat.disabled||hat.overflow)throw Error("Hat option gate failed");
  }
 }
 ws.close();
}finally{child.kill();await pause(250);rmSync(profile,{recursive:true,force:true});}
