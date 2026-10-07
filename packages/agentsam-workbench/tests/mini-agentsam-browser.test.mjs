import assert from 'node:assert/strict';
import http from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const chrome = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome','/usr/bin/chromium'].find(existsSync);
const source = (relative) => readFileSync(path.join(root, relative), 'utf8');

test('miniAgentSam stays compact on focus and expands tools only by explicit action', { skip: !chrome }, async () => {
  const html = '<!doctype html><html><body><div id="target" style="position:absolute;left:260px;top:180px;width:180px;height:50px">Target</div><script type="module" src="/fixture.js"></script></body></html>';
  const fixture = [
    "import { createMiniAgentSam } from '/mini-agentsam.js';",
    "const wait=ms=>new Promise(r=>setTimeout(r,ms));",
    "const mini=createMiniAgentSam({send:async()=>({ok:true})});",
    "const target=document.getElementById('target');",
    "mini.select({type:'test.resource',id:'one'},()=>target.getBoundingClientRect());",
    "await wait(40);",
    "const portal=document.querySelector('[data-mini-agentsam]');",
    "const shadow=portal.shadowRoot;",
    "const composer=shadow.querySelector('.composer');",
    "const input=shadow.querySelector('textarea');",
    "const more=shadow.querySelector('.more');",
    "const tools=shadow.querySelector('.tools');",
    "const before=composer.getBoundingClientRect();",
    "input.focus(); await wait(40); const focused=composer.getBoundingClientRect();",
    "const focusedExpanded=composer.classList.contains('expanded');",
    "more.click(); await wait(40); const explicit=composer.getBoundingClientRect();",
    "const result={beforeWidth:Math.round(before.width),focusedWidth:Math.round(focused.width),explicitWidth:Math.round(explicit.width),focusedExpanded,explicitExpanded:composer.classList.contains('expanded'),toolsVisible:!tools.hidden,ariaExpanded:more.getAttribute('aria-expanded')};",
    "const pre=document.createElement('pre'); pre.id='result'; pre.textContent=JSON.stringify(result); document.body.append(pre);"
  ].join('\n');
  const server=http.createServer((req,res)=>{
    const pathname=new URL(req.url||'/', 'http://localhost').pathname;
    if(pathname==='/') return res.writeHead(200,{'content-type':'text/html'}).end(html);
    if(pathname==='/fixture.js') return res.writeHead(200,{'content-type':'text/javascript'}).end(fixture);
    if(pathname==='/mini-agentsam.js') return res.writeHead(200,{'content-type':'text/javascript'}).end(source('packages/agentsam-workbench/src/mini-agentsam.js').replace('./composer.js','/composer.js'));
    if(pathname==='/composer.js') return res.writeHead(200,{'content-type':'text/javascript'}).end(source('packages/agentsam-workbench/src/composer.js'));
    res.writeHead(404).end();
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try {
    const url='http://127.0.0.1:'+server.address().port+'/';
    const {stdout}=await promisify(execFile)(chrome,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--virtual-time-budget=2500','--window-size=900,700','--dump-dom',url],{timeout:30000,encoding:'utf8',maxBuffer:1<<20});
    const match=stdout.match(/<pre id="result">([^<]+)<\/pre>/);
    assert.ok(match,'browser fixture did not finish');
    const result=JSON.parse(match[1].replaceAll('&quot;','"').replaceAll('&amp;','&'));
    assert.equal(result.beforeWidth,240);
    assert.equal(result.focusedWidth,240);
    assert.equal(result.focusedExpanded,false);
    assert.equal(result.explicitWidth,240);
    assert.equal(result.explicitExpanded,true);
    assert.equal(result.toolsVisible,true);
    assert.equal(result.ariaExpanded,'true');
  } finally { server.close(); }
});
