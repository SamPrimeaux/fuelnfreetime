import assert from 'node:assert/strict';
import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => readFileSync(path.join(root,file),'utf8');
const chrome = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/chromium','/usr/bin/google-chrome'].find(existsSync);
assert.ok(chrome);
const markup = `<!doctype html><html lang="en"><head><title>Inspect button acceptance</title></head><body>
  <header><div class="console-topbar-actions"></div></header>
  <script>window.__errs=[];const savedError=console.error;console.error=(...xs)=>{window.__errs.push(xs.map(String).join(" "));savedError(...xs);};window.addEventListener("unhandledrejection",e=>window.__errs.push(String(e.reason)));</script>
  <iframe id="theme-preview" src="/shop" width="500" height="450" title="Storefront preview"></iframe>
  <script src="/admin/js/inspector.js"></script>
  <script>(async function(){
    const wait = ms => new Promise(r => setTimeout(r,ms));
    let result;
    try {
      let button;
      for (let i=0;i<40;i++) {
        button = document.querySelector('[data-inspect-toggle]');
        if(button&&!button.disabled)break;
        await wait(100);
      }
      if(!button || button.disabled)throw Error('Inspect toggle missing or disabled: '+JSON.stringify({exists:!!button,disabled:button?.disabled,frameSrc:document.querySelector('iframe')?.getAttribute('src'),frameAccessible:!!document.querySelector('iframe')?.contentDocument,bar:document.querySelector('.console-topbar-actions')?.innerHTML,init:typeof window.initEcommerceInspector,workbench:!!document.querySelector('[data-mini-agentsam]'), errors:window.__errs}));
      button.click();
      const active = window.__fnfGlobalInspectMode === true;
      let composer;
      for(let i=0;i<30;i++){
        document.getElementById('theme-preview').contentDocument?.getElementById('headline')?.click();
        const portal=document.querySelector('[data-mini-agentsam]');
        composer=portal?.shadowRoot?.querySelector('.composer');
        if(composer&&!composer.hidden)break;
        await wait(90);
      }
      result={exists:!!button,enabled:!button.disabled,active,selected:composer && !composer.hidden,sendArrow:composer?.querySelector('.send')?.textContent.trim(),role:button.getAttribute('aria-label')};
    }catch(error){result={failure:String(error)};}
    const el=document.createElement('pre');el.id='inspect-result';el.textContent=JSON.stringify(result);document.body.append(el);
  })()</script>
</body></html>`;
const files={
  '/admin/js/inspector.js':'apps/ecommerce-cms-agentsam/frontend/inspector.js',
  '/admin/workbench/index.js':'packages/agentsam-workbench/src/index.js',
  '/admin/workbench/media-asset-workbench.js':'packages/agentsam-workbench/src/media-asset-workbench.js',
  '/admin/workbench/mini-agentsam.js':'packages/agentsam-workbench/src/mini-agentsam.js',
  '/admin/workbench/composer.js':'packages/agentsam-workbench/src/composer.js',
};
const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url||'/', 'http://127.0.0.1').pathname;
  if(pathname==='/admin/theme-editor')return res.writeHead(200,{'content-type':'text/html'}).end(markup);
  if(pathname==='/shop')return res.writeHead(200,{'content-type':'text/html'}).end('<h1 id="headline" data-cms-section="hero">Storefront headline</h1>');
  if(files[pathname])return res.writeHead(200,{'content-type':'text/javascript'}).end(read(files[pathname]));
  res.writeHead(404).end();
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
try {
  const {stdout:dom}=await promisify(execFile)(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--virtual-time-budget=5500','--window-size=1180,830','--dump-dom',`http://127.0.0.1:${server.address().port}/admin/theme-editor`],{timeout:45000,encoding:'utf8',maxBuffer:1<<20});
  const found=dom.match(/<pre id="inspect-result">([^<]+)<\/pre>/);
  assert.ok(found,'Inspect fixture did not complete');
  const result=JSON.parse(found[1].replaceAll('&quot;','"').replaceAll('&amp;','&').replaceAll('&lt;','<').replaceAll('&gt;','>'));
  assert.equal(result.failure,undefined,JSON.stringify(result));
  assert.equal(result.exists,true);
  assert.equal(result.enabled,true);
  assert.equal(result.active,true);
  assert.equal(result.selected,true);
  assert.equal(result.sendArrow,'↑');
  assert.match(result.role,/inspect.*annotate/i);
  console.log('PASS: Theme Studio global Inspect toggle mounts and opens miniAgentSam on storefront selection');
} finally {server.close()}
