import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
const root=resolve(import.meta.dirname,"..");
const js=readFileSync(join(root,"apps/ecommerce-cms-agentsam/frontend/static/js/theme-settings-live.js"),"utf8");
const css=readFileSync(join(root,"apps/ecommerce-cms-agentsam/frontend/static/css/theme-settings-live.css"),"utf8");
const chrome=[
 "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
 "/usr/bin/google-chrome","/usr/bin/chromium"
].find(existsSync);
test("Chrome: real theme color, button and CSS controls fit phone and desktop and mutate CMS bridge", {skip:!chrome},()=>{
 const dir=mkdtempSync(join(tmpdir(),"merchant-theme-"));
 try {
  const html='<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+
    css+'</style></head><body style="margin:0"><div style="width:280px;max-width:100%"><section data-drawer-panel="theme-settings"></section></div>'+
    '<iframe id="theme-preview" srcdoc="<!doctype html><style>:root{--h-color-accent:#ff4d00;--h-color-ink:#f7f5f0}</style>" style="width:0;height:0"></iframe>'+
    '<script>window.store={};window.calls=0;window.CmsThemeSettings={read:()=>structuredClone(window.store),'+
    'update:(value)=>{window.store=structuredClone(value);window.calls++;return true;}};</script>'+
    '<script>'+js+'</script>'+
    '<script>setTimeout(()=>{try{const root=document.querySelector(".ts-live");'+
    'const color=root.querySelector("[data-theme-color=accent]");color.value="#123456";color.dispatchEvent(new Event("input",{bubbles:true}));'+
    'const css=root.querySelector("[data-theme-css]");css.value=".h-button {letter-spacing:1px;}";css.dispatchEvent(new Event("input",{bubbles:true}));'+
    'const radius=root.querySelector("[data-theme-radius]");radius.value="24";radius.dispatchEvent(new Event("input",{bubbles:true}));'+
    'const result={colors:store.colors,css:store.customCss,radius:store.buttonRadius,calls,viewport:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth+1,categories:[...root.querySelectorAll("summary")].map(x=>x.textContent)};'+
    'const p=document.createElement("pre");p.id="browser-result";p.textContent=JSON.stringify(result);document.body.append(p);'+
    '}catch(error){const p=document.createElement("pre");p.id="browser-result";p.textContent=JSON.stringify({fatal:String(error)});document.body.append(p);}},300);</script>'+
    '</body></html>';
  const file=join(dir,"fixture.html");
  writeFileSync(file,html);
  for (const width of [1440,390]) {
   const run=spawnSync(chrome,["--headless=new","--no-sandbox","--disable-dev-shm-usage","--disable-gpu",
    "--virtual-time-budget=1700","--window-size="+width+",860",
    "--user-data-dir="+join(dir,"chrome-"+width),"--dump-dom",pathToFileURL(file).href],
    {encoding:"utf8",timeout:30000,maxBuffer:1<<22});
   if(run.error)throw run.error;
   const captured=(run.stdout||"").match(/<pre id="browser-result">([^<]+)<\/pre>/);
   assert.ok(captured,"Browser test did not finish: "+(run.stderr||"").slice(-500));
   const result=JSON.parse(captured[1].replaceAll("&quot;",'"').replaceAll("&amp;","&"));
   assert.equal(result.fatal,undefined,JSON.stringify(result));
   assert.equal(result.colors.accent,"#123456");
   assert.equal(result.radius,24);
   assert.match(result.css,/letter-spacing/);
   assert.equal(result.calls,3);
   assert.deepEqual(result.categories,["Colors","Typography","Buttons","Custom CSS"]);
   assert.equal(result.overflow,false);
   console.log("PASS "+width+"px: live Theme Settings render and route edits into CMS.");
  }
 }finally{rmSync(dir,{recursive:true,force:true});}
});


test("Chrome: scoped Hero CSS changes the Hero but never its neighboring section", {skip:!chrome},()=>{
 const dir=mkdtempSync(join(tmpdir(),"merchant-section-css-"));
 try {
  const runtime=readFileSync(join(root,"packages/heuristic-theme/storefront/js/cms-hydrate.js"),"utf8").replaceAll("</script","<\\/script");
  const html='<!doctype html><html lang="en" data-cms-page="shop"><head><meta name="viewport" content="width=device-width,initial-scale=1">'+
   '<style>.demo-heading {color:#000000}</style></head><body>'+
   '<section data-cms-section="hero"><h1 class="demo-heading">Hero</h1></section>'+
   '<section data-cms-section="collections"><h1 class="demo-heading">Neighbor</h1></section>'+
   '<script>window.fetch=async url=>({ok:true,json:async()=>({page:String(url).includes("/site")?{sections:[]}:{sections:'+
   '[{key:"hero",content:{__editor:{customCss:".demo-heading { color: #123456; }"}}},{key:"collections",content:{}}]}})});</script>'+
   '<script>'+runtime+'</script>'+
   '<script>setTimeout(()=>{const h=document.querySelector("[data-cms-section=hero] h1");const n=document.querySelector("[data-cms-section=collections] h1");'+
   'const style=document.getElementById("cms-section-css-hero");const data={hero:getComputedStyle(h).color,neighbor:getComputedStyle(n).color,scoped:!!style&&style.textContent.includes("@scope")};'+
   'const out=document.createElement("pre");out.id="browser-result";out.textContent=JSON.stringify(data);document.body.append(out);},800);</script></body></html>';
  const file=join(dir,"fixture.html");
  writeFileSync(file,html);
  const run=spawnSync(chrome,["--headless=new","--no-sandbox","--disable-dev-shm-usage","--disable-gpu",
   "--virtual-time-budget=2200","--window-size=1200,900",
   "--user-data-dir="+join(dir,"chrome"),"--dump-dom",pathToFileURL(file).href],{
    encoding:"utf8",timeout:30000,maxBuffer:1<<22
   });
  if(run.error)throw run.error;
  const captured=(run.stdout||"").match(/<pre id="browser-result">([^<]+)<\/pre>/);
  assert.ok(captured,"Chrome CSS result not produced: "+(run.stderr||"").slice(-600));
  const data=JSON.parse(captured[1].replaceAll("&quot;",'"').replaceAll("&amp;","&"));
  assert.equal(data.scoped,true);
  assert.equal(data.hero,"rgb(18, 52, 86)");
  assert.equal(data.neighbor,"rgb(0, 0, 0)");
 } finally {rmSync(dir,{recursive:true,force:true});}
});
