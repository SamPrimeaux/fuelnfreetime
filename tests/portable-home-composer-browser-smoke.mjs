import http from "node:http";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getRegistryPage } from "../apps/ecommerce-cms-agentsam/backend/cms/registry.js";
import "../packages/theme-contract/runtime/portable-sections.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const chrome = [
  "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium", "/usr/bin/chromium-browser",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
].find(fs.existsSync);
assert.ok(chrome, "Chrome is mandatory for Home storefront proof.");

const portable = globalThis.ThemePortableSections.defaults("revise/faq");
portable.title = "Questions on the Home page";
portable.card1.question = "Is this a genuine section?";
portable.card1.answer = "Yes, alongside the existing home composer.";
const sections = getRegistryPage("home").sections;
sections.push({ key:"faq-cross-theme",sort_order:15,status:"published",content:portable });

const html = [
'<!doctype html><html lang="en"><head><meta charset="utf-8">',
'<meta name="viewport" content="width=device-width,initial-scale=1"></head><body>',
'<main id="heuristic-page"></main>',
'<script type="module" src="/js/page-composer.js" data-page="home" data-preset="fuel-free-time"></script>',
'<script>',
'setTimeout(function(){',
'  var root=document.querySelector("#heuristic-page");',
'  var section=document.querySelector(\'[data-cms-section="faq-cross-theme"]\');',
'  var proof={',
'    children:root?.children.length || 0,',
'    hasNativeHero:!!root?.querySelector(".hc-hero"),',
'    hasNativeNewsletter:!!root?.querySelector(".hc-newsletter"),',
'    hasPortableFaq:!!section,',
'    faqText:section?.querySelector("summary")?.textContent || null,',
'    h2:section?.querySelector("h2")?.textContent || null,',
'    order:[...root.querySelectorAll(":scope > section")].map(x=>x.dataset.cmsSection||x.dataset.hSection),',
'    error:root?.querySelector(".hc-compose-error")?.textContent || null',
'  };',
'  var p=document.createElement("pre");p.id="home-proof";p.textContent=JSON.stringify(proof);document.body.appendChild(p);',
'},2800);',
'</script></body></html>',
].join("\n");

const presetRoot = path.join(root,"packages/heuristic-theme/presets/fuel-free-time");
const assets = {
  "/js/page-composer.js": path.join(root,"packages/heuristic-theme/storefront/js/page-composer.js"),
  "/js/cms-structure.js": path.join(root,"packages/heuristic-theme/storefront/js/cms-structure.js"),
  "/js/portable-sections.js": path.join(root,"packages/theme-contract/runtime/portable-sections.js"),
  "/js/portable-sections.css": path.join(root,"packages/theme-contract/runtime/portable-sections.css"),
};

const server=http.createServer((req,res)=>{
  const u=new URL(req.url,"http://localhost");
  const route=u.pathname;
  if(route==="/")return void res.writeHead(200,{"content-type":"text/html"}).end(html);
  if(route==="/api/cms/pages/home"){
    res.writeHead(200,{"content-type":"application/json"});
    return void res.end(JSON.stringify({ok:true,page:{slug:"home",status:"published",sections}}));
  }
  let filepath=assets[route];
  if(!filepath && route.startsWith("/theme/presets/fuel-free-time/")){
    const tail=route.slice("/theme/presets/fuel-free-time/".length);
    if(!tail.includes("..")) filepath=path.join(presetRoot,tail);
  }
  if(!filepath || !fs.existsSync(filepath))return void res.writeHead(404).end("Missing");
  res.writeHead(200,{"content-type":filepath.endsWith(".json")?"application/json":filepath.endsWith(".css")?"text/css":"text/javascript"});
  res.end(fs.readFileSync(filepath));
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
let dom;
try {
  const url="http://127.0.0.1:"+server.address().port+"/";
  ({stdout:dom}=await promisify(execFile)(chrome,[
    "--headless=new","--no-sandbox","--disable-gpu","--disable-dev-shm-usage",
    "--virtual-time-budget=6500","--window-size=1440,1000","--dump-dom",url,
  ],{timeout:60000,encoding:"utf8",maxBuffer:1<<22}));
} finally {server.close();}
const match=dom.match(/<pre id="home-proof">([^<]+)<\/pre>/);
assert.ok(match,"Home composer failed to render probe");
const proof=JSON.parse(match[1].replaceAll("&quot;",'"').replaceAll("&amp;","&"));
console.log(JSON.stringify(proof,null,2));
assert.equal(proof.error,null,"Native Home composer must keep rendering the site");
assert.equal(proof.hasNativeHero,true);
assert.equal(proof.hasNativeNewsletter,true);
assert.equal(proof.hasPortableFaq,true);
assert.equal(proof.faqText,"Is this a genuine section?");
assert.equal(proof.h2,"Questions on the Home page");
assert.ok(proof.children>=7,"Native sections must coexist with portable inserts");
console.log("PASS: Home retains actual preset sections and inserts a portable Revise FAQ");
