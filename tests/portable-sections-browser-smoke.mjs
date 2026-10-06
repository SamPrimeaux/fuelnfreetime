import http from "node:http";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import "../packages/theme-contract/runtime/portable-sections.js";

const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const chrome = [
  "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium", "/usr/bin/chromium-browser",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
].find(fs.existsSync);
assert.ok(chrome, "Chrome is mandatory for storefront section proof");
const file = (p) => fs.readFileSync(path.join(root,p), "utf8");
const runtime = globalThis.ThemePortableSections;
const faq = runtime.defaults("revise/faq");
faq.title = "Answers merchants can edit";
faq.card1.question = "Does it really work?";
faq.card1.answer = "Yes, in the published storefront.";
const rail = runtime.defaults("revise/wardrobe-rail");
rail.title = "Collections from another theme";
rail.card1.name = "Real collection";
rail.card1.href = "/shop/collections/real";
const hero = runtime.defaults("fnf/scene-hero");
hero.headline = "One library, real output";
hero.ctaPrimary.href = "/shop";
const rows = [
  {key:"hero",status:"published",sort_order:0,content:{headline:"Existing Heuristic hero"}},
  {key:"cross-hero",status:"published",sort_order:10,content:hero},
  {key:"cross-rail",status:"published",sort_order:20,content:rail},
  {key:"cross-faq",status:"published",sort_order:30,content:faq},
];
const updated = JSON.parse(JSON.stringify(rows));
updated[3].content.title = "Updated without separate preview renderer";

const html = [
'<!doctype html><html lang="en" data-cms-page="shop"><head>',
'<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
'<title>Storefront runtime fixture</title></head><body>',
'<main id="real-storefront"><section data-cms-section="hero"><h2 data-cms="headline">Original hero</h2></section></main>',
'<script src="/js/cms-hydrate.js" defer></script>',
'<script>',
'setTimeout(function() {',
'  const sections = [...document.querySelectorAll("#real-storefront > [data-cms-section]")];',
'  const before = {',
'    order: sections.map(el=>el.dataset.cmsSection),',
'    variants: sections.map(el=>el.dataset.portablePreset || null),',
'    faq: document.querySelector(\'[data-cms-section="cross-faq"] summary\')?.textContent,',
'    title: document.querySelector(\'[data-cms-section="cross-faq"] h2\')?.textContent,',
'    rail: document.querySelector(\'[data-cms-section="cross-rail"] .ps-card strong\')?.textContent,',
'    hero: document.querySelector(\'[data-cms-section="cross-hero"] .ps-display\')?.textContent,',
'    css: getComputedStyle(document.querySelector(\'[data-cms-section="cross-faq"]\')).backgroundColor,',
'  };',
'  const updated = '+JSON.stringify(updated)+';',
'  window.postMessage({type:"fnf-cms-preview",slug:"shop",sections:updated,siteSections:[]},location.origin);',
'  setTimeout(function() {',
'    const after = document.querySelector(\'[data-cms-section="cross-faq"] h2\')?.textContent;',
'    const node = document.createElement("pre");',
'    node.id = "proof"; node.textContent = JSON.stringify({before,after}); document.body.appendChild(node);',
'  },750);',
'},1900);',
'</script></body></html>'
].join("\n");

const json = (res, value) => {
  res.writeHead(200, {"content-type":"application/json"});
  res.end(JSON.stringify(value));
};
const server = http.createServer((req,res) => {
  const url = new URL(req.url,"http://localhost").pathname;
  if(url==="/") return void res.writeHead(200,{"content-type":"text/html"}).end(html);
  if(url==="/api/cms/pages/site") return json(res,{ok:true,page:{slug:"site",sections:[]}});
  if(url==="/api/cms/pages/shop") return json(res,{ok:true,page:{slug:"shop",sections:rows}});
  const assets = {
    "/js/cms-hydrate.js":"packages/heuristic-theme/storefront/js/cms-hydrate.js",
    "/js/portable-sections.js":"packages/theme-contract/runtime/portable-sections.js",
    "/js/portable-sections.css":"packages/theme-contract/runtime/portable-sections.css",
  };
  if(assets[url]) return void res.writeHead(200,{"content-type":url.endsWith(".css")?"text/css":"text/javascript"})
    .end(file(assets[url]));
  res.writeHead(404).end("Missing");
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
let dom="";
try {
  const url="http://127.0.0.1:"+server.address().port+"/";
  ({stdout:dom}=await run(chrome,["--headless=new","--no-sandbox","--disable-gpu","--disable-dev-shm-usage",
    "--virtual-time-budget=6500","--window-size=1440,900","--dump-dom",url],
    {timeout:60000,encoding:"utf8",maxBuffer:1<<22}));
} finally {server.close();}
const match=dom.match(/<pre id="proof">([^<]+)<\/pre>/);
assert.ok(match,"Storefront hydration did not finish");
const proof=JSON.parse(match[1].replaceAll("&quot;",'"').replaceAll("&amp;","&"));
console.log(JSON.stringify(proof,null,2));
assert.deepEqual(proof.before.order,["hero","cross-hero","cross-rail","cross-faq"]);
assert.deepEqual(proof.before.variants,[null,"fnf/scene-hero","revise/wardrobe-rail","revise/faq"]);
assert.equal(proof.before.faq,"Does it really work?");
assert.equal(proof.before.rail,"Real collection");
assert.equal(proof.before.hero,"One library, real output");
assert.equal(proof.before.title,"Answers merchants can edit");
assert.equal(proof.after,"Updated without separate preview renderer");
assert.notEqual(proof.before.css,"rgba(0, 0, 0, 0)");
console.log("PASS: public DOM displays and updates three real cross-theme sections");
