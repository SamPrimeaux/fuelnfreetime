import assert from "node:assert/strict";
import http from "node:http";
import {readFileSync,writeFileSync,existsSync,mkdirSync} from "node:fs";
import {execFile} from "node:child_process";
import {promisify} from "node:util";
import path from "node:path";
import {fileURLToPath} from "node:url";

const exec=promisify(execFile);
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const css=readFileSync(path.join(root,"apps/ecommerce-cms-agentsam/frontend/static/css/theme-settings-panel.css"),"utf8");
const js=readFileSync(path.join(root,"apps/ecommerce-cms-agentsam/frontend/static/js/theme-settings-panel.js"),"utf8");
const chrome=["/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium","/usr/bin/chromium-browser","/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"].find(existsSync);
assert.ok(chrome,"Chrome required for visual Theme Settings test");
const initial='<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/theme-settings.css"><style>*{box-sizing:border-box}body{margin:0;background:#f8f8fa;font:12px system-ui}.review{display:grid;grid-template-columns:280px minmax(0,1fr);min-height:100vh}.review aside{height:100vh;overflow:auto;background:#fff;border-right:1px solid #ddd}.review main{padding:20px}.review .canvas{height:500px;background:#e6e6e9;border-radius:8px;display:grid;place-items:center;font-size:23px;color:#52525a}header{padding:14px 20px;height:54px;background:#fff;border-bottom:1px solid #ddd}@media(max-width:600px){.review{display:block}.review aside{width:100%;height:calc(100dvh - 54px)}.review main{display:none}}</style></head><body><header>Theme Studio · isolated frontend review</header><div id="te-theme-name" hidden>Heuristic</div><div id="te-preview-device" data-device="desktop"></div><div class="review"><aside><div data-drawer-panel="theme-settings"></div></aside><main><div class="canvas">Storefront preview placeholder</div><iframe id="theme-preview" title="Isolated preview" hidden></iframe></main></div><script src="/theme-settings.js"></script><script src="/probe.js"></script></body></html>';
const probe='setTimeout(function(){try{var r=document.querySelector("#ts-theme-root");var b=[...r.querySelectorAll("[data-ts-toggle]")];var errors=[];window.addEventListener("error",e=>errors.push(e.message));b[15].click();var sw=[...r.querySelectorAll("input[data-ts-key]")].find(x=>x.dataset.tsKey==="swatches.width"&&x.type==="range");sw.value="57";sw.dispatchEvent(new Event("input",{bubbles:true}));var updated=[...r.querySelectorAll("input[data-ts-key]")].find(x=>x.dataset.tsKey==="swatches.width"&&x.type==="number").value;b[16].click();var wasClosed=b[15].getAttribute("aria-expanded")==="false";var opened=b[16].getAttribute("aria-expanded")==="true";b[2].click();var one=r.querySelectorAll("[data-ts-toggle][aria-expanded=true]").length;var visible=r.querySelectorAll(".ts-category-content:not([hidden])").length;var ariaConsistent=b.every(x=>{var on=x.getAttribute("aria-expanded")==="true";var p=document.getElementById(x.getAttribute("aria-controls"));return p.hidden===!on&&p.hasAttribute("inert")===!on&&p.getAttribute("aria-hidden")===String(!on)&&x.dataset.state===(on?"open":"closed");});var typeFields=r.querySelectorAll("[data-ts-panel=type] .ts-field").length;var body=JSON.stringify({mounted:!!r,categories:b.length,one,visible,ariaConsistent,updated,wasClosed,opened,typeFields,errors,overflow:document.documentElement.scrollWidth>innerWidth+1});var pre=document.createElement("pre");pre.id="theme-result";pre.textContent=body;pre.hidden=true;document.body.appendChild(pre);}catch(e){var er=document.createElement("pre");er.id="theme-result";er.textContent=JSON.stringify({probeError:String(e),stack:String(e.stack)});document.body.appendChild(er);}},350);';
// Verify the injected browser probe itself before launching Chromium.
new Function(probe);
const server=http.createServer((req,res)=>{
 const pathname=new URL(req.url||"/","http://localhost").pathname;
 if(pathname==="/")return res.writeHead(200,{"content-type":"text/html"}).end(initial);
 if(pathname==="/theme-settings.css")return res.writeHead(200,{"content-type":"text/css"}).end(css);
 if(pathname==="/theme-settings.js")return res.writeHead(200,{"content-type":"application/javascript"}).end(js);
 if(pathname==="/probe.js")return res.writeHead(200,{"content-type":"application/javascript"}).end(probe);
 res.writeHead(404).end();
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const dir=process.env.THEME_SETTINGS_SCREENSHOT_DIR||"/tmp/theme-settings-screens";
mkdirSync(dir,{recursive:true});
// Portable, isolated review artifact; not a storefront or CMS publish.
const standalone=initial
 .replace('<link rel="stylesheet" href="/theme-settings.css">','<style>'+css+'</style>')
 .replace('<script src="/theme-settings.js"></script><script src="/probe.js"></script>','<script>'+js.replaceAll('</script>','<\\/script>')+'</script>');
writeFileSync(path.join(dir,'theme-settings-interactive-review.html'),standalone,'utf8');
try {
 for(const width of [1440,834,390]){
 const url="http://127.0.0.1:"+server.address().port+"/";
 const args=["--headless=new","--disable-gpu","--disable-dev-shm-usage","--no-sandbox","--hide-scrollbars","--virtual-time-budget=3000","--window-size="+width+",960","--screenshot="+path.join(dir,"theme-settings-"+width+".png"),"--dump-dom",url];
 const {stdout}=await exec(chrome,args,{timeout:45000,encoding:"utf8",maxBuffer:1<<22});
 const match=stdout.match(/<pre id="theme-result"[^>]*>([^<]+)<\/pre>/);
 if(!match) console.error("Chromium output tail:",stdout.slice(-4000));
 assert.ok(match,"Missing Theme Settings browser probe at "+width+"px");
 const result=JSON.parse(match[1].replaceAll("&quot;",'"').replaceAll("&amp;","&"));
 assert.equal(result.probeError,undefined,result.stack||result.probeError);
 assert.equal(result.mounted,true);
 assert.equal(result.categories,18);
 assert.equal(result.one,1);
 assert.equal(result.visible,1,"Only one category body may be displayed");
 assert.equal(result.ariaConsistent,true,"Chevron, disclosure and focus state must agree");
 assert.equal(result.updated,"57");
 assert.equal(result.wasClosed,true);
 assert.equal(result.opened,true);
 assert.ok(result.typeFields>=25);
 assert.equal(result.overflow,false,"Unexpected horizontal clipping at "+width);
 assert.deepEqual(result.errors,[]);
 console.log("PASS: theme settings Chromium "+width+"px",result);
 }
} finally {server.close();}
