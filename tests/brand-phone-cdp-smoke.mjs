/**
 * Real Chrome viewport probe of the existing Content -> Brand page.
 * Mock admin transport supplies source-backed fixtures; no customer writes.
 */
import assert from "node:assert/strict";
import http from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";

const exec = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const chrome = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium",
].find(existsSync);
if (!chrome) throw new Error("Chrome required for responsive browser smoke");
const read = (name) => readFileSync(path.join(root, name), "utf8");
const fakeBrand = {
  ok: true,
  company: {
    name: "Fuel & Free Time", tagline: "Time is the real flex.",
    primaryColor: "#ff4d00", authBgColor: "#090909",
    logoUrl: null, meta: {
      brand_profile_source: { path: "docs/brand/business-brand-dossier.md", version: "2026-09" }
    },
  },
  profile: { purpose:"Earn your time", mission:"Make time count", voice:"Direct and confident" },
  roles: [
    { role:"logo", label:"Primary logo", url:null },
    { role:"favicon", label:"Favicon", url:null },
    { role:"social_image", label:"Social image", url:null },
    { role:"wordmark", label:"Wordmark", url:null },
  ],
  assets: [],
};
const shell = [
  '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">',
  '<script>',
  'const testBrand = ' + JSON.stringify(fakeBrand) + ';',
  'window.__probeErrors=[]; window.addEventListener("error",e=>window.__probeErrors.push(e.message)); window.addEventListener("unhandledrejection",e=>window.__probeErrors.push(String(e.reason)));',
  'window.__requests=[]; async function adminFetch(path) { window.__requests.push(path); return testBrand; }',
  'function renderShell(_route, html, options) {',
  'document.body.insertAdjacentHTML("beforeend", html);',
  'window.setTimeout(() => { if (options && options.onReady) options.onReady(); }, 1);',
  '}',
  '</script>'
].join("");
const probe = [
  '<script>window.addEventListener("load", () => setTimeout(() => {',
  'document.querySelector("[data-content-view=brand]")?.click();',
  'setTimeout(() => {',
  'const target=document.getElementById("content-view-brand");',
  'const nav=document.querySelector(".brand-workspace-nav");',
  'const links=[...nav.querySelectorAll("a")];',
  'const styles=getComputedStyle(nav);',
  'const padding=getComputedStyle(target).paddingBottom;',
  'const info={requests:window.__requests,grid:document.getElementById("brand-role-grid")?.innerText.slice(0,80),note:document.getElementById("brand-note")?.textContent,err:window.__probeErrors,initFn:typeof window.initBrandWorkspace,tab:document.getElementById("content-tab-brand")?.getAttribute("aria-selected"),width:innerWidth,bodyScroll:document.documentElement.scrollWidth,',
  'brandWidth:target.clientWidth,brandScroll:target.scrollWidth,',
  'navColumns:styles.gridTemplateColumns.split(" ").length,',
  'navVisible:links.every(a => a.getBoundingClientRect().width > 30),',
  'brandName:document.getElementById("brand-name").value,',
  'saveStatus:document.getElementById("brand-save-status").textContent,',
  'profile:document.getElementById("brand-profile-purpose").value,',
  'sourceVisible:!document.getElementById("brand-source-note").hidden,',
  'paddingBottom:parseFloat(padding),',
  'formFont:parseFloat(getComputedStyle(document.getElementById("brand-name")).fontSize)};',
  'const pre=document.createElement("pre");pre.id="brand-mobile-smoke";pre.textContent=JSON.stringify(info);document.body.append(pre);',
  '},350);',
  '},100));</script>',
].join("");
const html = read("apps/ecommerce-cms-agentsam/frontend/static/content.html")
  .replace('<script src="/admin/js/shell.js"></script>', shell)
  .replace("</body>", probe + "</body>");
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url || "/", "http://localhost").pathname;
  if (pathname === "/admin/content") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(html);
  } else if (pathname === "/admin/js/brand-workspace.js") {
    res.writeHead(200, { "content-type": "application/javascript" })
      .end(read("apps/ecommerce-cms-agentsam/frontend/static/js/brand-workspace.js"));
  } else if (pathname === "/admin/js/media-library.js") {
    res.writeHead(200, { "content-type": "application/javascript" }).end("export function initMediaLibrary(){}");
  } else if (pathname.startsWith("/admin/css/")) {
    res.writeHead(200, { "content-type": "text/css" })
      .end(read("apps/ecommerce-cms-agentsam/frontend/static/css/" + path.basename(pathname)));
  } else res.writeHead(404).end();
});
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const launchUrl = "http://127.0.0.1:" + server.address().port + "/admin/content";
const debugPortServer = http.createServer();
await new Promise((resolve) => debugPortServer.listen(0, "127.0.0.1", resolve));
const debugPort = debugPortServer.address().port;
await new Promise((resolve) => debugPortServer.close(resolve));
const dataDir = mkdtempSync(path.join(tmpdir(), "fnf-brand-cdp-"));
const browser = spawn(chrome, [
  "--headless=new", "--no-sandbox", "--disable-gpu", "--no-first-run",
  "--disable-dev-shm-usage", "--remote-debugging-port=" + debugPort,
  "--remote-allow-origins=*", "--user-data-dir=" + dataDir, "about:blank",
], { stdio: "ignore" });
let socket;
try {
  let target;
  for (let attempt = 0; attempt < 45 && !target; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 180));
    try {
      const pages = await (await fetch("http://127.0.0.1:" + debugPort + "/json")).json();
      target = pages.find((item) => item.type === "page");
    } catch { /* Chrome still initializing */ }
  }
  assert.ok(target?.webSocketDebuggerUrl, "Chrome DevTools page did not start");
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  let nextId = 0;
  const pending = new Map();
  socket.addEventListener("message", ({data}) => {
    const message = JSON.parse(typeof data === "string" ? data : data.toString());
    if (!message.id || !pending.has(message.id)) return;
    const {resolve, reject} = pending.get(message.id);
    pending.delete(message.id);
    message.error ? reject(new Error(message.error.message)) : resolve(message.result || {});
  });
  function command(method, params={}) {
    return new Promise((resolve,reject) => {
      const id=++nextId;
      pending.set(id,{resolve,reject});
      socket.send(JSON.stringify({id,method,params}));
    });
  }
  await command("Page.enable");
  await command("Runtime.enable");
  for (const width of [360,390,430,744,834,1440]) {
    await command("Emulation.setDeviceMetricsOverride", {
      width, height:950, deviceScaleFactor:1, mobile:width < 760,
    });
    await command("Page.navigate", { url:launchUrl + "?viewport=" + width });
    let result;
    for (let attempt=0; attempt < 35; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 170));
      try {
        const evaluated = await command("Runtime.evaluate",{
          expression:'location.search==="?viewport=' + width + '" ? (document.getElementById("brand-mobile-smoke")?.textContent || "") : ""',
          returnByValue:true,
        });
        if (evaluated.result?.value) {
          result=JSON.parse(evaluated.result.value);
          break;
        }
      } catch { /* navigating */ }
    }
    assert.ok(result, "No phone render completed at " + width);
    assert.equal(result.width,width,"Actual CSS viewport must match requested width");
    assert.equal(result.brandName,"Fuel & Free Time");
    assert.equal(result.profile,"Earn your time");
    assert.equal(result.sourceVisible,true);
    assert.equal(result.brandScroll<=result.brandWidth+2,true,"Brand horizontal overflow at "+width);
    assert.equal(result.navVisible,true);
    if(width<=430) {
      assert.ok(result.navColumns>=2,"Mobile navigation not fully wrapped");
      assert.ok(result.paddingBottom>=200,"Dock obscures end of workspace");
      assert.ok(result.formFont>=16,"iOS focused input zoom");
    }
    console.log("PASS actual emulated CSS width",width,"brand loaded, no overflow, all fields visible");
  }
} finally {
  if(socket && socket.readyState === 1) socket.close();
  await new Promise((resolve) => {
    if (browser.exitCode !== null) return resolve();
    browser.once("exit", resolve);
    browser.kill("SIGTERM");
    setTimeout(resolve, 1500).unref();
  });
  await new Promise((resolve) => server.close(resolve));
  try { rmSync(dataDir,{force:true,recursive:true,maxRetries:10,retryDelay:200}); }
  catch (error) { console.warn("Chrome profile cleanup pending:", error.code); }
}
