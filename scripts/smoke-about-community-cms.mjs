import http from "node:http";
import path from "node:path";
import assert from "node:assert/strict";
import {readFileSync,existsSync,statSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {execFile} from "node:child_process";
import {promisify} from "node:util";
const exec=promisify(execFile);
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const web=path.join(root,"dist/assets");
const chrome=["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
"/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium"].find(existsSync);
assert(chrome,"Chrome required");
function probe(){
 setTimeout(function(){
  const sectionNames=Array.from(document.querySelectorAll("[data-cms-section]"))
    .map(el=>el.getAttribute("data-cms-section"));
  const story=document.querySelector(".full-story-section .story-content p");
  const gallery=document.querySelector(".gallery-item .gallery-media");
  const event=document.querySelector(".event-image .event-media");
  const report={
   sectionNames,
   heading:document.querySelector("h1")?.textContent.trim(),
   copyColor:story?getComputedStyle(story).color:null,
   sourceBlocks:document.querySelectorAll("[data-cms-block]").length,
   galleryImages:document.querySelectorAll(".gallery-media").length,
   eventImages:document.querySelectorAll(".event-media").length,
   galleryDisplay:gallery?getComputedStyle(gallery).display:null,
   eventDisplay:event?getComputedStyle(event).display:null,
   cta:document.querySelector(".social-cta")?.getAttribute("href"),
   overflow:document.documentElement.scrollWidth-window.innerWidth,
  };
  const pre=document.createElement("pre");pre.id="fnf-cms-smoke";pre.textContent=JSON.stringify(report);
  document.body.appendChild(pre);
 },900);
}
const script="<script>("+probe.toString()+")()</scr"+"ipt>";
const mime={".html":"text/html;charset=utf-8",".css":"text/css",".js":"application/javascript",
 ".png":"image/png",".jpg":"image/jpeg",".svg":"image/svg+xml",".webp":"image/webp",
 ".woff2":"font/woff2",".mp4":"video/mp4"};
const server=http.createServer((req,res)=>{
 const u=new URL(req.url||"/","http://localhost").pathname;
 const f=u==="/about"?"about.html":u==="/community"?"community.html":u.slice(1);
 const target=path.resolve(web,f);
 if(!target.startsWith(web+path.sep)||!existsSync(target)||!statSync(target).isFile()){
  res.writeHead(404).end();return;
 }
 let data=readFileSync(target);
 if(f.endsWith(".html"))data=Buffer.from(data.toString("utf8").replace("</body>",script+"</body>"));
 res.writeHead(200,{"content-type":mime[path.extname(target)]||"application/octet-stream"}).end(data);
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
try{
 for(const slug of ["about","community"])for(const width of [390,744,1280]){
  const url="http://127.0.0.1:"+server.address().port+"/"+slug;
  const {stdout}=await exec(chrome,["--headless=new","--no-sandbox","--disable-gpu",
   "--disable-dev-shm-usage","--no-first-run","--force-device-scale-factor=1",
   "--virtual-time-budget=3500","--window-size="+width+",980","--dump-dom",url
  ],{timeout:60000,encoding:"utf8",maxBuffer:1<<24});
  const match=stdout.match(/<pre id="fnf-cms-smoke">([^<]+)<\/pre>/);
  assert(match,"Chrome probe not found for "+slug+" "+width);
  const d=JSON.parse(match[1].replaceAll("&quot;",'"').replaceAll("&amp;","&"));
  assert.deepEqual(d.sectionNames,slug==="about"?
   ["hero","moment","video","collections","against","lafayette","origins","lifestyle","cta"]:
   ["hero","events","gallery","join","stories","social"]);
  assert(d.heading?.length>6);
  assert(d.sourceBlocks>=(slug==="about"?13:16));
  assert(d.overflow<=35,"Horizontal overflow: "+slug+" "+width+"="+d.overflow);
  if(slug==="about"){
   assert(d.copyColor && d.copyColor!=="rgb(255, 255, 255)","Unreadable About text");
  }else{
   assert.equal(d.galleryImages,6);assert.equal(d.eventImages,4);
   assert.equal(d.galleryDisplay,"block");assert.equal(d.eventDisplay,"block");
   assert.equal(d.cta,"/collaborate");
  }
  console.log("PASS "+slug+" "+width+"px: "+d.sectionNames.length+
   " sections, "+d.sourceBlocks+" blocks, overflow="+d.overflow);
 }
}finally{server.close()}
