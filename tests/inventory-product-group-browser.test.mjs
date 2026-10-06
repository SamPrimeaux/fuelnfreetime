import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync,existsSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {groupProductInventory} from '../packages/agentsam-merch/src/product-spine.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=file=>readFileSync(path.join(root,file),'utf8');
const chrome=['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'].find(existsSync);
if(!chrome)throw new Error('Chrome unavailable for inventory browser smoke');
const rows=[
  {id:11,product_id:1,product_title:'Store Tee',status:'active',sku:'TEE-M',size:'M',color:'Black',inventory_qty:7},
  {id:12,product_id:1,product_title:'Store Tee',status:'active',sku:'TEE-S',size:'S',color:'Black',inventory_qty:2},
  {id:21,product_id:2,product_title:'Print Hoodie',status:'draft',sku:'POD-L',size:'L',color:'Brick',inventory_qty:0}
];
const links=[{product_id:2,completeful_catalog_product_id:'catalog-123',sync_status:'pending'}];
const boot=`
window.__errors=[];
window.addEventListener('error',e=>window.__errors.push(e.message));
window.addEventListener('unhandledrejection',e=>window.__errors.push(String(e.reason)));
window.__groups=${JSON.stringify(groupProductInventory(rows,links))};
window.__writes=[];
window.__conflict=false;
window.renderShell=(_route,markup)=>document.body.insertAdjacentHTML('beforeend',markup);
window.adminFetch=async (url,options)=>{
  if(url==='/api/admin/inventory') return {ok:true,groups:window.__groups};
  if(url.includes('/inventory')&&options?.method==='PATCH'){
    const body=JSON.parse(options.body);window.__writes.push(body);
    if(window.__conflict)throw new Error('Inventory changed since you opened this product.');
    for(const group of window.__groups) for(const v of group.variants) if(v.id===11){
      group.total_available+=body.inventory_qty-v.inventory_qty;
      v.inventory_qty=body.inventory_qty;
    }
    return {ok:true};
  }
  throw new Error('Unknown test route '+url);
};`;
const page=read('apps/ecommerce-cms-agentsam/frontend/static/inventory.html');
const server=http.createServer((req,res)=>{
  const p=new URL(req.url,'http://127.0.0.1').pathname;
  if(p==='/admin/inventory')return res.writeHead(200,{'content-type':'text/html'}).end(page);
  if(p==='/admin/js/shell.js')return res.writeHead(200,{'content-type':'application/javascript'}).end(boot);
  if(p.startsWith('/admin/css/'))return res.writeHead(200,{'content-type':'text/css'}).end(read('apps/ecommerce-cms-agentsam/frontend/static/css/'+path.basename(p)));
  res.writeHead(404).end();
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const debug=http.createServer();await new Promise(resolve=>debug.listen(0,'127.0.0.1',resolve));
const port=debug.address().port;await new Promise(resolve=>debug.close(resolve));
const temp=mkdtempSync(path.join(tmpdir(),'fnf-inventory-browser-'));
const browser=spawn(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-first-run','--remote-debugging-port='+port,'--remote-allow-origins=*','--user-data-dir='+temp,'about:blank'],{stdio:'ignore'});
let socket;
try{
  let target;
  for(let i=0;i<55&&!target;i++){
    await new Promise(r=>setTimeout(r,120));
    try{target=(await(await fetch('http://127.0.0.1:'+port+'/json')).json()).find(x=>x.type==='page');}catch{}
  }
  assert.ok(target?.webSocketDebuggerUrl,'Chrome DevTools must be ready');
  socket=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  let id=0;const pending=new Map();
  socket.addEventListener('message',({data})=>{
    const m=JSON.parse(data);const p=pending.get(m.id);if(!p)return;
    pending.delete(m.id);if(m.error)p.reject(new Error(m.error.message));else p.resolve(m.result||{});
  });
  const send=(method,params={})=>new Promise((resolve,reject)=>{
    const n=++id;pending.set(n,{resolve,reject});socket.send(JSON.stringify({id:n,method,params}));
  });
  const evalJs=async expression=>{
    const data=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
    if(data.exceptionDetails)throw new Error(JSON.stringify(data.exceptionDetails));
    return data.result?.value;
  };
  const wait=async expression=>{
    for(let i=0;i<40;i++){if(await evalJs(expression))return;
      await new Promise(r=>setTimeout(r,90));}
    throw new Error('Wait failed '+expression);
  };
  await send('Page.enable');await send('Runtime.enable');
  for(const width of [375,1440]){
    await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width===375});
    await send('Page.navigate',{url:'http://127.0.0.1:'+server.address().port+'/admin/inventory'});
    await wait("document.querySelectorAll('.inventory-product').length===2");
    const metric=await evalJs("(()=>{let x=document.querySelector('.inventory-space').getBoundingClientRect();return {x:x.left,right:x.right,viewport:innerWidth}})()");
    assert.ok(metric.right<=metric.viewport+3, 'outer inventory layout must stay within viewport '+width);
    assert.equal(await evalJs("[...document.querySelectorAll('.inventory-product summary')].some(x=>x.textContent.includes('Store Tee'))"),true);
    await evalJs("document.getElementById('inventory-search').value='POD-L';document.getElementById('inventory-search').dispatchEvent(new Event('input',{bubbles:true}))");
    assert.equal(await evalJs("document.querySelectorAll('.inventory-product').length"),1);
    await evalJs("document.getElementById('inventory-search').value='';document.getElementById('inventory-search').dispatchEvent(new Event('input',{bubbles:true}))");
    if(width===1440){
      await evalJs("document.querySelector('[data-product-id=\"1\"]').open=true");
      await evalJs("(()=>{let x=document.querySelector('[data-variant-id=\"11\"] .inv-qty');x.value='6';x.dispatchEvent(new Event('input',{bubbles:true}));})()");
      assert.equal(await evalJs("!document.querySelector('[data-variant-id=\"11\"] .inv-save').disabled"),true);
      await evalJs("document.querySelector('[data-variant-id=\"11\"] .inv-save').click()");
      await wait("window.__writes.length===1");
      assert.deepEqual(await evalJs("window.__writes[0]"),{inventory_qty:6,expected_inventory_qty:7});
      await wait("window.__groups.find(g=>g.id===1).variants.find(v=>v.id===11).inventory_qty===6");
      await evalJs("window.__conflict=true;document.querySelector('[data-product-id=\"1\"]').open=true");
      await evalJs("(()=>{let x=document.querySelector('[data-variant-id=\"11\"] .inv-qty');x.value='4';x.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('[data-variant-id=\"11\"] .inv-save').click();})()");
      await wait("document.querySelector('[data-variant-id=\"11\"] .inventory-row-status').textContent.includes('changed')");
      assert.equal(await evalJs("window.__groups.find(g=>g.id===1).variants.find(v=>v.id===11).inventory_qty"),6);
    }
    assert.deepEqual(await evalJs('window.__errors'),[]);
    console.log('PASS inventory viewport',width,'px, grouped products, search and save guard');
  }
}finally{
  if(socket?.readyState===1)socket.close();
  await new Promise(resolve=>{if(browser.exitCode!==null)return resolve();browser.once('exit',resolve);browser.kill('SIGTERM');setTimeout(resolve,1300).unref();});
  await new Promise(resolve=>server.close(resolve));
  try{rmSync(temp,{recursive:true,force:true,maxRetries:8,retryDelay:100});}catch{}
}
