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
await new Promise((resolve) => server.listen(0,"127.0.0.1",resolve));
try {
  for (const width of [500,744,1440]) {
    const address = "http://127.0.0.1:" + server.address().port + "/admin/content";
    const {stdout} = await exec(chrome, [
      "--headless=new", "--no-first-run", "--disable-gpu", "--no-sandbox",
      "--disable-dev-shm-usage", "--hide-scrollbars",
      "--virtual-time-budget=4500", "--window-size=" + width + ",1024",
      "--dump-dom", address
    ], {timeout:45000, maxBuffer: 2**22, encoding:"utf8"});
    const match = stdout.match(/<pre id="brand-mobile-smoke">([^<]+)<\/pre>/);
    assert.ok(match, "No Brand probe completed at " + width);
    const data = JSON.parse(match[1].replaceAll("&quot;",'"').replaceAll("&amp;","&"));
    console.log("VIEWPORT DATA",width,JSON.stringify(data));
    assert.equal(data.brandName, "Fuel & Free Time", "Brand data must load");
    assert.equal(data.profile, "Earn your time");
    assert.equal(data.sourceVisible, true);
    assert.ok(data.brandScroll <= data.brandWidth + 2, "Brand area overflow " + JSON.stringify(data));
    assert.ok(data.navVisible, "Brand navigation invisible " + width);
    if (width <= 500) {
      assert.ok(data.navColumns >= 2, "Navigation must wrap on phones");
      assert.ok(data.paddingBottom >= 200, "Admin dock clearance missing on phone");
      assert.ok(data.formFont >= 16, "iOS input zoom risk");
    }
    console.log("PASS Chrome desktop window width", width, JSON.stringify(data));
  }
} finally {
  server.close();
}
