/**
 * Real Chrome smoke: the existing Online Store HTML should render the published
 * storefront inside desktop and mobile preview cards, at actual CSS viewport widths.
 *
 * Uses a same-origin static storefront fixture; production site behavior must still
 * be checked after deployment. No authenticated account or remote API is needed.
 */
import assert from "node:assert/strict";
import http from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import path from "node:path";

const exec = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const chrome = [
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
].find(existsSync);

if (!chrome) {
  console.error("FAIL: Chrome is required for storefront preview browser verification.");
  process.exit(1);
}

const file = (name) => readFileSync(path.join(root, name), "utf8");
const fixture = {
  store: { visibility: "public" },
  performance: {
    lcp_ms: { value: null, status: "unavailable" },
    inp_ms: { value: null, status: "unavailable" },
    cls: { value: null, status: "unavailable" },
    sessions_desktop: { value: null, status: "unavailable" },
    sessions_mobile: { value: null, status: "unavailable" }
  },
  active_theme: { id: "heuristic", name: "Heuristic", preview_href: "/?preview=1",
    edit_href: "/admin/theme-editor?slug=home" },
  draft_themes: []
};

const headShim = '<script>' +
  'function renderShell(route, html) { document.body.insertAdjacentHTML("beforeend", html); }' +
  'async function adminFetch() { return ' + JSON.stringify(fixture) + '; }' +
  '</script>';

const probe = '<script>setTimeout(function () {' +
  'var desktop=document.getElementById("theme-preview-desktop");' +
  'var mobile=document.getElementById("theme-preview-mobile");' +
  'var result={' +
  'desktopSrc:desktop.getAttribute("src"),mobileSrc:mobile.getAttribute("src"),' +
  'desktopStatus:desktop.parentElement.dataset.previewStatus,' +
  'mobileStatus:mobile.parentElement.dataset.previewStatus,' +
  'desktopWidth:desktop.style.width,mobileWidth:mobile.style.width,' +
  'desktopMain:!!desktop.contentDocument?.querySelector("#rendered-storefront"),' +
  'mobileMain:!!mobile.contentDocument?.querySelector("#rendered-storefront"),' +
  'lcp:document.getElementById("perf-lcp").textContent,' +
  'desktopCount:document.querySelector("#perf-sessions .desktop")?.textContent' +
  '};document.body.insertAdjacentHTML("beforeend",'+
  '"<pre id=\\"browser-result\\"></pre>");' +
  'document.getElementById("browser-result").textContent=JSON.stringify(result);' +
  '},2500)</script>';

const storePage = file("apps/ecommerce-cms-agentsam/frontend/static/store.html")
  .replace('<script src="/admin/js/shell.js"></script>', headShim)
  .replace("</body>", probe + "</body>");

const storefrontPage = '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head>' +
  '<body style="margin:0;background:#f2a15a"><main id="rendered-storefront" style="min-height:100vh;' +
  'font:700 70px/1.15 system-ui;padding:80px 50px;box-sizing:border-box;color:#161616">' +
  'PUBLISHED STOREFRONT — REAL IFRAME DOM</main></body></html>';

const server = http.createServer((req, res) => {
  const route = new URL(req.url || "/", "http://localhost").pathname;
  if (route === "/admin/store") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(storePage);
  } else if (route === "/") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(storefrontPage);
  } else if (route === "/admin/css/console.css") {
    res.writeHead(200, { "content-type": "text/css" })
      .end(file("apps/ecommerce-cms-agentsam/frontend/static/css/console.css"));
  } else if (route === "/admin/css/admin.css") {
    res.writeHead(200, { "content-type": "text/css" })
      .end(file("apps/ecommerce-cms-agentsam/frontend/static/css/admin.css"));
  } else {
    res.writeHead(404).end();
  }
});

await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
let dom;
try {
  const url = "http://127.0.0.1:" + server.address().port + "/admin/store";
  ({ stdout: dom } = await exec(chrome, [
    "--headless=new", "--disable-gpu", "--disable-dev-shm-usage", "--no-sandbox",
    "--virtual-time-budget=6000", "--window-size=1440,1000", "--dump-dom", url
  ], { timeout: 60000, encoding: "utf8", maxBuffer: 1 << 22 }));
} finally {
  server.close();
}

const match = dom.match(/<pre id="browser-result">([^<]+)<\/pre>/);
assert.ok(match, "Browser never finished loading the Online Store preview");
const result = JSON.parse(match[1]
  .replaceAll("&quot;", '"')
  .replaceAll("&amp;", "&")
  .replaceAll("&lt;", "<")
  .replaceAll("&gt;", ">"));
console.log(JSON.stringify(result, null, 2));

assert.equal(result.desktopSrc, "/");
assert.equal(result.mobileSrc, "/");
assert.equal(result.desktopStatus, "ready");
assert.equal(result.mobileStatus, "ready");
assert.equal(result.desktopWidth, "1440px");
assert.equal(result.mobileWidth, "390px");
assert.equal(result.desktopMain, true, "Desktop preview must render real storefront DOM");
assert.equal(result.mobileMain, true, "Mobile preview must render real storefront DOM");
assert.equal(result.lcp, "—");
assert.equal(result.desktopCount, "— Desktop");
console.log("PASS: both published preview cards render genuine same-origin storefront DOM in Chrome");
