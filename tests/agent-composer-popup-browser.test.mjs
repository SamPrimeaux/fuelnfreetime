/**
 * Actual click-through Chromium smoke for the shared AgentSam + popover.
 * Serves SOURCE assets (not a mocked replacement of the menu code).
 * Run: node tests/agent-composer-popup-browser.test.mjs
 * If no Chromium is installed, reports a skip; contract tests still run.
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const runBrowser = promisify(execFile);
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assetBase = path.join(root, "apps/ecommerce-cms-agentsam/frontend/static");
const chrome = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"
].find(existsSync);
if (!chrome) {
  console.log("SKIP: Chromium not available; browser click-through not exercised.");
  process.exit(0);
}
const fixture = String.raw`<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="/admin/css/agentsam.css">
<style>body{font-family:system-ui;padding:70px 70px 20px;min-height:600px}
form{width:500px;max-width:100%;display:grid;gap:10px}
button{cursor:pointer}textarea{height:55px}</style>
<script defer src="/admin/js/home-workspace.js"></script></head><body>
<form id="home-agent-form">
  <textarea id="home-agent-input"></textarea>
  <button type="button" id="home-agent-plus" aria-expanded="false">+</button>
  <button type="button" id="home-agent-open">Open</button>
  <button type="submit" id="home-agent-send">Send</button>
  <div class="fnf-home-composer__attachments"></div>
</form>
<form id="agentsam-form" class="agentsam-compose">
  <textarea id="agentsam-input"></textarea>
  <button id="agentsam-plus" type="button" aria-expanded="false">+</button>
  <div class="agentsam-attachment-list"></div>
</form>
<pre id="out">PENDING</pre>
<script>
const sleep = t => new Promise(resolve => setTimeout(resolve,t));
const all = selector => [...document.querySelectorAll(selector)];
const visible = () => all('.asm-capability-popover').find(p => !p.hidden);
const row = label => [...(visible()?.querySelectorAll('.asm-menu-row') || [])].find(b => b.querySelector('.asm-menu-row__content > span')?.textContent === label);
const result = { checks: {}, errors: [] };
async function run() {
  try {
    // Launch the first click BEFORE the lazily loaded capability script is ready.
    await sleep(300);
    result.checks.firstClickOpened = !!visible() && document.getElementById('home-agent-plus').getAttribute('aria-expanded') === 'true';
    result.checks.menuPositioned = !!visible() && (() => {
      const r=visible().getBoundingClientRect();
      return r.width>190 && r.width<260 && r.left>=0 && r.top>=0 && r.right<=innerWidth && r.bottom<=innerHeight;
    })();
    result.checks.rootItems = ["Files","Upload from device","Target","Mention","Skills","Apps"].every(label => !!row(label));
    row("Target")?.click();
    result.checks.targetChildMenu = !!row("Products") && !!visible()?.querySelector('.asm-menu-back');
    row("Products")?.click();
    result.checks.targetContext = window.AgentSamDraft?.selected_resource?.path === "/admin/products";
    result.checks.chipVisible = !!document.querySelector('#home-agent-form .asm-attachment-chip');
    document.getElementById('home-agent-plus').click();
    row("Mention")?.click();
    const search = visible()?.querySelector('input.asm-menu-search');
    if(search){search.value="orders";search.dispatchEvent(new Event('input',{bubbles:true}));}
    result.checks.searchFilters = !!search && row("Orders")?.hidden === false && row("Products")?.hidden === true;
    row("Orders")?.click();
    result.checks.mentionInserted = document.getElementById('home-agent-input').value.includes('@orders');
    document.getElementById('home-agent-plus').click();
    row("Skills")?.click();
    await sleep(90);
    result.checks.skillsDiscovered = !!row("Store Audit");
    row("Store Audit")?.click();
    result.checks.skillInserted = document.getElementById('home-agent-input').value.includes('/store-audit');
    document.getElementById('home-agent-plus').click();
    row("Apps")?.click();
    await sleep(90);
    result.checks.appsDiscovered = !!row("FNF Plugin") && !!row("Disconnected Tool");
    result.checks.appNotFake = row("Disconnected Tool")?.querySelector('small')?.textContent === "Needs connection";
    visible()?.querySelector('.asm-menu-back')?.click();
    result.checks.backWorks = !!row("Files");
    document.dispatchEvent(new KeyboardEvent('keydown',{bubbles:true,key:'Escape'}));
    result.checks.escapeCloses = !visible() && document.getElementById('home-agent-plus').getAttribute('aria-expanded') === 'false';
    // Side composer uses the same implementation (no alternative popup).
    window.AgentSamComposerMenu.mount(document.getElementById('agentsam-form'), document.getElementById('agentsam-plus'), document.getElementById('agentsam-input'));
    document.getElementById('agentsam-plus').click();
    result.checks.sideChatMenu = !!visible() && !!row("Files");
    document.body.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
    result.checks.outsideClickCloses = !visible();
  } catch(e) { result.errors.push(String(e?.stack || e)); }
  document.getElementById('out').textContent = 'AGENT_MENU_SMOKE:' + JSON.stringify(result);
}
document.addEventListener('DOMContentLoaded', () => {
  // Home bootstrap attaches a temporary click handler, then asynchronously
  // fetches menu script; the first click must be replayed after mount.
  document.getElementById('home-agent-plus').click();
  run();
});
</script></body></html>`;
const known = {
  "/admin/js/agent-composer-menu.js": ["js/agent-composer-menu.js","application/javascript"],
  "/admin/js/home-workspace.js": ["js/home-workspace.js","application/javascript"],
  "/admin/css/agentsam.css": ["css/agentsam.css","text/css"],
};
const server = createServer((req, res) => {
  const p = new URL(req.url, "http://127.0.0.1").pathname;
  if (p === "/") { res.writeHead(200, { "Content-Type": "text/html" }); res.end(fixture); return; }
  if (p === "/api/admin/agentsam/skills") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok:true, skills:[{slug:"store-audit",name:"Store Audit",description:"Read-only store checks"}] }));
    return;
  }
  if (p === "/api/admin/agentsam/status") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok:true, mcp_servers:[{slug:"fnf",display_name:"FNF Plugin",connected:true},{slug:"other",display_name:"Disconnected Tool",connected:false}] }));
    return;
  }
  if (known[p]) {
    const [filename, type] = known[p];
    res.writeHead(200, { "Content-Type": type });
    res.end(readFileSync(path.join(assetBase, filename)));
    return;
  }
  res.writeHead(404); res.end("Not found");
});
server.listen(0, "127.0.0.1", async () => {
  const url = "http://127.0.0.1:" + server.address().port;
  try {
    // Must be asynchronous: spawnSync blocks the Node HTTP fixture server.
    const browser = await runBrowser(chrome, [
      "--headless", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage",
      "--disable-background-networking", "--no-first-run", "--virtual-time-budget=2800",
      "--window-size=1100,820", "--dump-dom", url
    ], { encoding:"utf8", timeout:20000, maxBuffer:4 * 1024 * 1024 });
    const match = browser.stdout.match(/AGENT_MENU_SMOKE:({[^<]+})/);
    if (!match) {
      console.error("No smoke result:", browser.stdout.slice(-1100));
      process.exitCode = 1;
      return;
    }
    const parsed = JSON.parse(match[1].replace(/&quot;/g,'"').replace(/&amp;/g,'&'));
    for (const [name, ok] of Object.entries(parsed.checks)) {
      console.log((ok ? "PASS" : "FAIL") + " " + name);
    }
    if(parsed.errors.length) console.error(parsed.errors.join("\n"));
    const failed = Object.entries(parsed.checks).filter(([, ok])=>!ok);
    if (failed.length || parsed.errors.length || Object.keys(parsed.checks).length < 10) {
      console.error(failed.length + " menu interactions failed.");
      process.exitCode = 1;
    }
  } catch (error) {
    console.error("Browser smoke failed:", error.message);
    process.exitCode = 1;
  } finally {
    server.close();
  }
});
