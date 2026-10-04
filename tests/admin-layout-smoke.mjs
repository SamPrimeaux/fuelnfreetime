/**
 * Real-page layout smoke test: loads the assembled admin pages in Chrome iframes at true CSS
 * widths with the API stubbed, and asserts the compact-shell and wide-screen layout rules.
 * Node stdlib only.
 *
 *   npm run build:admin:skip && node tests/admin-layout-smoke.mjs
 *
 * Skips (exit 0) when Chrome is not installed.
 */
import http from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";

const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assets = path.join(root, "dist/assets");
const chrome = ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"].find((p) => existsSync(p));
if (!chrome) { console.log("SKIP: no Chrome found"); process.exit(0); }
if (!existsSync(path.join(assets, "admin/shell.js")) && !existsSync(path.join(assets, "admin/js/shell.js"))) {
  console.error("dist/assets/admin missing. Run: npm run build:admin:skip");
  process.exit(1);
}

const PAGES = ["/admin/product-edit?id=1", "/admin/home", "/admin/preferences", "/admin/orders", "/admin/products", "/admin/inventory", "/admin/pages", "/admin/content", "/admin/store"];
const WIDTHS = [390, 744, 1024, 1440, 1920, 2560];

const stub = (url) => {
  const p = url.pathname;
  if (p === "/api/admin/me") return { ok: true, id: 1, email: "owner@example.com", role: "owner", display_name: "Owner", initials: "O", mailboxes: [], primary_mailbox: null };
  if (p === "/api/admin/products/1") return { ok: true, product: { id: 1, title: "A Product With A Fairly Long Descriptive Title Tee", slug: "a-product-with-a-fairly-long-descriptive-title-tee", description: "Earned-not-given energy on premium cotton for people who fuel hard and live free.", collection: "High Octane", status: "active", price_cents: 3400 }, variants: [1, 2, 3, 4].map((i) => ({ id: i, size: ["S", "M", "L", "XL"][i - 1], sku: `SKU-LONG-IDENTIFIER-${i}`, price_cents: 3400, inventory_qty: 4 })) };
  if (p === "/api/admin/products/1/images") return { ok: true, images: [1, 2, 3].map((i) => ({ id: i, url: `/none-${i}.png`, filename: `image-${i}.png`, is_primary: i === 1 ? 1 : 0 })) };
  return { ok: true };
};

const outer = `<!doctype html><pre id="out"></pre><script>
const pages=${JSON.stringify(PAGES)},widths=${JSON.stringify(WIDTHS)},res=[];let n=0;const total=pages.length*widths.length;
function measure(f){try{const d=f.contentDocument,w=f.contentWindow,main=d.querySelector('.console-main'),top=d.querySelector('.console-topbar');
if(!main)return{error:'no .console-main'};const cs=getComputedStyle(main);let maxRight=0,offender='';
main.querySelectorAll('*').forEach(el=>{if(getComputedStyle(el).position==='fixed')return;let sc=false;for(let a=el.parentElement;a&&a!==main;a=a.parentElement){const ox=getComputedStyle(a).overflowX;if(ox==='auto'||ox==='scroll'||a.getAttribute('aria-hidden')==='true'||a.hidden||getComputedStyle(a).position==='fixed'){sc=true;break}}if(sc)return;const r=el.getBoundingClientRect();if(r.width>0&&r.right>maxRight){maxRight=r.right;let a=el,c=[];for(let i=0;i<3&&a&&a!==main;i++){c.push(a.tagName+(a.className?'.'+String(a.className).split(' ')[0]:''));a=a.parentElement}offender=c.join(' < ')+' :: '+el.outerHTML.replace(/\\s+/g,' ').slice(0,90)}});
const first=main.firstElementChild;return{innerWidth:w.innerWidth,padL:parseFloat(cs.paddingLeft),padR:parseFloat(cs.paddingRight),padT:parseFloat(cs.paddingTop),
gapTop:first&&top?Math.round(first.getBoundingClientRect().top-top.getBoundingClientRect().bottom):null,clipped:main.scrollWidth>main.clientWidth+1,scrollW:main.scrollWidth,clientW:main.clientWidth,maxRight:Math.round(maxRight),offender}}catch(e){return{error:String(e)}}}
pages.forEach(p=>widths.forEach(w=>{const f=document.createElement('iframe');f.width=w;f.height=900;f.style.cssText='border:0;display:block';f.src=p;
f.onload=()=>setTimeout(()=>{res.push({page:p,w,...measure(f)});if(++n===total)document.getElementById('out').textContent=JSON.stringify(res)},2500);document.body.appendChild(f)}));
</script>`;

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  if (url.pathname === "/index.html") return void res.writeHead(200, { "content-type": "text/html" }).end(outer);
  if (url.pathname.startsWith("/api/")) return void res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(stub(url)));
  let file = path.join(assets, path.normalize(url.pathname));
  if (!file.startsWith(assets)) return void res.writeHead(403).end();
  if (!existsSync(file) || !statSync(file).isFile()) file += ".html";
  if (!existsSync(file) || !statSync(file).isFile()) return void res.writeHead(404).end();
  const type = { ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".html": "text/html", ".svg": "image/svg+xml" }[path.extname(file)] || "application/octet-stream";
  res.writeHead(200, { "content-type": type }).end(readFileSync(file));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;
let dom;
try {
  ({ stdout: dom } = await run(chrome, ["--headless=new", "--disable-gpu", "--window-size=1600,900", "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1", "--virtual-time-budget=60000", "--dump-dom", `http://127.0.0.1:${port}/index.html`], { encoding: "utf8", maxBuffer: 1 << 24, timeout: 120000 }));
} finally { server.close(); }
const m = dom.match(/<pre id="out">([\s\S]*?)<\/pre>/);
if (!m || !m[1].trim()) { console.error("no result from Chrome"); process.exit(1); }
const results = JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">"));

const failures = [];
for (const r of results) {
  const tag = `${r.page} @${r.w}`;
  const check = (ok, msg) => { if (!ok) failures.push(`${tag}: ${msg}`); };
  if (r.error) { check(false, r.error); continue; }
  check(!r.clipped, `horizontal clipping (scrollWidth ${r.scrollW} > clientWidth ${r.clientW}; widest: ${r.offender})`);
  check(r.maxRight <= r.innerWidth + 1, `content reaches ${r.maxRight}px in a ${r.innerWidth}px viewport (${r.offender})`);
  if (r.w <= 900) {
    check(r.padT <= 20, `top padding ${r.padT} (legacy 68px double count?)`);
    check(Math.abs(r.padL - 16) <= 1 && Math.abs(r.padR - 16) <= 1, `side padding ${r.padL}/${r.padR} != 16`);
    check(r.gapTop !== null && r.gapTop <= 40, `gap under topbar ${r.gapTop}px`);
  }
  if (r.w === 1440) check(r.padL <= 41, `desktop padding ${r.padL} should stay 40`);
  if (r.w === 1920) check(r.padL >= 100, `wide tier should center content (padding ${r.padL})`);
  if (r.w === 2560) check(r.padL >= 200, `TV tier should center content (padding ${r.padL})`);
}
if (failures.length) { console.error("FAIL\n" + failures.map((f) => " - " + f).join("\n")); process.exit(1); }
console.log(`PASS: ${PAGES.length} pages x ${WIDTHS.length} widths (${WIDTHS.join(", ")}px) — no clipping, one padding source, wide tiers centered`);
