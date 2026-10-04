/**
 * Responsive smoke test for the admin dock: serves dist/assets, loads the dock in
 * iframes at real CSS widths, and asserts the size contract. Node stdlib only.
 *
 *   npm run build:admin:skip && node tests/dock-responsive-smoke.mjs
 *
 * Chrome is located on macOS/Linux PATH defaults; the test skips (exit 0) with a
 * message when no Chrome is found, so CI without a browser stays green.
 */
import http from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const run = promisify(execFile);
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assets = path.join(root, "dist/assets");
const chrome = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].find((p) => existsSync(p));
if (!chrome) { console.log("SKIP: no Chrome found"); process.exit(0); }
if (!existsSync(path.join(assets, "admin/dock/index.js"))) {
  console.error("dist/assets/admin/dock missing. Run: npm run build:admin:skip");
  process.exit(1);
}

const VISIBLE = [360, 390, 430, 744, 834, 900];
const HIDDEN = [901, 1024, 1440, 1920, 2560];

const inner = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<style>*{box-sizing:border-box}body{margin:0;font-family:system-ui}</style><link rel="stylesheet" href="/admin/dock/dock.css"><pre id="out">pending</pre>
<script type="module">
import { mountAdminDock } from "/admin/dock/index.js";
const out = {};
try {
  const config = await (await fetch("/admin/dock/dock.config.json")).json();
  mountAdminDock({ config, pathname: "/admin/products/create", host: { send: async () => {}, open() {}, openNav() {} } });
  const $ = (s) => document.querySelector(s), R = (e) => e.getBoundingClientRect(), wait = (ms) => new Promise((r) => setTimeout(r, ms));
  out.w = innerWidth; out.visible = $(".admin-dock").classList.contains("is-visible");
  if (out.visible) {
    const bar = R($(".admin-dock__bar")), orb = R($(".admin-dock__orb"));
    out.nav = { barH: Math.round(bar.height), orb: Math.round(orb.width), left: Math.round(bar.left), right: Math.round(innerWidth - orb.right),
      minTap: Math.min(...[...document.querySelectorAll(".admin-dock__tab")].flatMap((t) => [R(t).width, R(t).height])) };
    const detail = { active: true, hint: "Unsaved changes", dirty: true, canSave: true, saveLabel: "Create", onSave() {}, discardHref: "/admin/products" };
    document.dispatchEvent(new CustomEvent("admin-dock:edit", { detail })); await wait(20);
    const hint = $(".admin-dock__hint"), ed = $(".admin-dock__edit");
    out.edit = { hintW: Math.round(R(hint).width), hintClipped: hint.scrollWidth > hint.clientWidth, overflow: ed.scrollWidth > ed.clientWidth,
      minBtnH: Math.min(...[...document.querySelectorAll(".admin-dock__edit .admin-dock__btn")].map((b) => R(b).height)) };
    $(".admin-dock__orb").click(); await wait(20);
    document.dispatchEvent(new CustomEvent("admin-dock:edit", { detail: { active: true, hint: "x", dirty: false, canSave: false, saveLabel: "Save" } })); await wait(10);
    out.discardHiddenWhenNone = $('[data-edit="discard"]').hidden === true;
    document.body.classList.add("admin-dock-off");
    out.offHides = getComputedStyle($(".admin-dock")).display === "none";
    document.body.classList.remove("admin-dock-off");
    document.dispatchEvent(new CustomEvent("admin-dock:edit", { detail }));
    await wait(10);
    out.compose = { inputFont: getComputedStyle($(".admin-dock__input")).fontSize, inputH: R($(".admin-dock__input")).height,
      minChipH: Math.min(...[...document.querySelectorAll(".admin-dock__chip")].map((c) => R(c).height)), sendW: R($(".admin-dock__send")).width };
  }
} catch (e) { out.error = String(e && e.stack || e); }
document.getElementById("out").textContent = JSON.stringify(out);
</script>`;
const widths = [...VISIBLE, ...HIDDEN];
const outer = `<!doctype html><pre id="out"></pre><script>
const widths=${JSON.stringify(widths)},res={};let n=0;
widths.forEach(w=>{const f=document.createElement('iframe');f.width=w;f.height=844;f.src='/inner.html';f.style.cssText='border:0;display:block';
f.onload=()=>setTimeout(()=>{try{res[w]=JSON.parse(f.contentDocument.getElementById('out').textContent)}catch(e){res[w]={error:String(e)}}
if(++n===widths.length)document.getElementById('out').textContent=JSON.stringify(res)},900);document.body.appendChild(f)});</script>`;

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://x").pathname;
  if (url === "/inner.html") return void res.writeHead(200, { "content-type": "text/html" }).end(inner);
  if (url === "/index.html") return void res.writeHead(200, { "content-type": "text/html" }).end(outer);
  const file = path.join(assets, path.normalize(url));
  if (!file.startsWith(assets) || !existsSync(file) || !statSync(file).isFile()) return void res.writeHead(404).end();
  const type = { ".js": "text/javascript", ".css": "text/css", ".json": "application/json" }[path.extname(file)] || "application/octet-stream";
  res.writeHead(200, { "content-type": type }).end(readFileSync(file));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;
let dom;
try {
  // Async on purpose: the server above lives in this process, so a blocking exec would deadlock it.
  ({ stdout: dom } = await run(chrome, ["--headless=new", "--disable-gpu", "--window-size=1600,900", "--virtual-time-budget=15000", "--dump-dom", `http://127.0.0.1:${port}/index.html`], { encoding: "utf8", maxBuffer: 1 << 24, timeout: 60000 }));
} finally { server.close(); }
const m = dom.match(/<pre id="out">([\s\S]*?)<\/pre>/);
if (!m) { console.error("no result from Chrome"); process.exit(1); }
const results = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"));

const failures = [];
const check = (w, ok, msg) => { if (!ok) failures.push(`${w}px: ${msg}`); };
for (const w of VISIBLE) {
  const r = results[w];
  check(w, r && !r.error && r.visible, `dock should be visible ${r?.error || ""}`);
  if (!r?.visible) continue;
  check(w, r.nav.minTap >= 44, `tab hit area ${r.nav.minTap} < 44`);
  check(w, r.nav.orb === 56, `orb ${r.nav.orb} != 56`);
  check(w, r.nav.barH >= 62 && r.nav.barH <= 66, `bar height ${r.nav.barH} not ~64`);
  check(w, r.nav.left >= 16 && r.nav.right >= 16, `side margins ${r.nav.left}/${r.nav.right} < 16`);
  check(w, !r.edit.overflow, "edit panel overflows");
  check(w, r.edit.hintW >= 90, `edit hint only ${r.edit.hintW}px wide (clipped=${r.edit.hintClipped})`);
  check(w, r.edit.minBtnH >= 44, `edit button height ${r.edit.minBtnH} < 44`);
  check(w, r.discardHiddenWhenNone === true, "Discard must hide when no discardHref/onDiscard");
  check(w, r.offHides === true, "body.admin-dock-off must hide the dock");
  check(w, r.compose.inputFont === "16px", `input font ${r.compose.inputFont} would zoom on iOS`);
  check(w, r.compose.inputH >= 44 && r.compose.minChipH >= 44 && r.compose.sendW >= 44, "compose targets < 44");
}
for (const w of HIDDEN) check(w, results[w] && results[w].visible === false, "dock must be hidden above 900px");
if (failures.length) { console.error("FAIL\n" + failures.map((f) => " - " + f).join("\n")); process.exit(1); }
console.log(`PASS: ${VISIBLE.length} compact widths meet the size contract; dock hidden at ${HIDDEN.join(", ")}px`);
