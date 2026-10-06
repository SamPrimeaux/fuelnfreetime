/**
 * Browser-visible Theme Editor acceptance probe. Node stdlib + local Chrome.
 *
 * Usage:
 *   node tests/launch/theme-editor-merchant-smoke.mjs
 *   FNF_THEME_SOURCE_ROOT=/Users/samprimeaux/fuelnfreetime-theme-studio-v1 \
 *     node tests/launch/theme-editor-merchant-smoke.mjs
 *
 * Exit 1 while critical merchant checkpoints are absent; this is an intentional
 * RED gate until the owning Theme Studio lane finishes the product.
 * No writes or production calls occur. CMS APIs are fixture-backed.
 */
import http from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sourceRoot = path.resolve(process.env.FNF_THEME_SOURCE_ROOT || root);
const src = path.join(sourceRoot, "apps/ecommerce-cms-agentsam/frontend");
const chrome = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].find(existsSync);
if (!chrome) {
  console.error("FAIL: Chrome required for visible editor QA (not an automatic skip)");
  process.exit(1);
}

const registryUrl = pathToFileURL(
  path.join(sourceRoot, "apps/ecommerce-cms-agentsam/backend/cms/registry.js")
).href;
const { getRegistryPage, listRegistryPages, registryForAdmin } = await import(registryUrl);
const json = (res, data) => {
  res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
};

const probe = String.raw`<script>
setTimeout(() => {
  const tree = document.querySelector('#te-tree');
  const names = [...document.querySelectorAll('.te-tree-row__name')].map(n => n.textContent.trim());
  const groups = [...document.querySelectorAll('.te-tree-group__label')].map(n => n.textContent.trim());
  const treeText = tree?.textContent || '';
  const themeChoices = [...document.querySelectorAll(
    'select[aria-label*="theme" i] option, [data-theme-option], [data-theme-select] option'
  )].map(n => n.textContent.trim());
  const select = document.querySelector('.te-tree-row__main');
  select?.click();
  const snapshot = {
    loaded: names.length > 0,
    viewportWidth: window.innerWidth,
    treeVisible: !!document.querySelector('.theme-studio-tree') && getComputedStyle(document.querySelector('.theme-studio-tree')).display !== 'none',
    fullPageOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    page: document.querySelector('#te-page-title')?.textContent?.trim() || null,
    sections: names,
    groups,
    globalHeader: groups.some(x => /^header$/i.test(x)),
    globalFooter: groups.some(x => /^footer$/i.test(x)),
    themeChoices,
    availableThemeOptions: ['Heuristic','Revise','FNF'].every(
      x => themeChoices.some(t => t.toLowerCase().includes(x.toLowerCase()))
    ),
    addSection: !!document.querySelector('#te-add-section'),
    saveDraft: !!document.querySelector('#te-save'),
    publish: !!document.querySelector('#te-publish'),
    inspector: document.querySelector('#te-inspector-title')?.textContent?.trim() || '',
    preview: !!document.querySelector('iframe#theme-preview'),
    sourceTitle: document.title,
    treeExcerpt: treeText.slice(0,300),
  };
  const p=document.createElement('pre');
  p.id='fnf-audit-result';
  p.textContent=JSON.stringify(snapshot);
  document.body.appendChild(p);
},1500);
</script>`;

const server = http.createServer((req, res) => {
  const u = new URL(req.url, "http://localhost");
  const p = u.pathname;
  if (p === "/api/admin/cms/registry") return json(res, registryForAdmin());
  if (p === "/api/admin/cms/pages/shop") return json(res, { ok: true, page: getRegistryPage("shop") });
  if (p === "/api/admin/cms/pages") return json(res, { ok: true, pages: listRegistryPages() });
  if (p === "/api/admin/me") return json(res, { ok: true, user: { id: 1, role: "owner", email: "merchant@example.com", display_name: "Merchant" }, role: "owner", email: "merchant@example.com" });
  if (p === "/api/admin/media") return json(res, { ok: true, assets: [] });
  if (p === "/api/admin/products") return json(res, { ok: true, products: [] });
  if (p === "/api/store/collections") return json(res, { ok: true, collections: [] });
  if (p.startsWith("/api/")) return json(res, { ok: true });
  if (p === "/shop") return void res.writeHead(200, { "content-type": "text/html" }).end('<!doctype html><html><body><section data-cms-section="hero">Storefront preview fixture</section></body></html>');
  if (p === "/admin/dock/dock.config.json") return json(res, { ok: true });

  let file = null;
  if (p === "/admin/theme-editor") file = path.join(src, "static/theme-editor.html");
  else if (p === "/admin/js/shell.js") file = path.join(src, "shell.js");
  else if (p.startsWith("/admin/js/")) file = path.join(src, "static/js", p.slice("/admin/js/".length));
  else if (p.startsWith("/admin/css/")) file = path.join(src, "static/css", p.slice("/admin/css/".length));
  else if (p === "/admin/favicon.svg") file = path.join(src, "public/favicon.svg");
  if (!file || !file.startsWith(src) || !existsSync(file)) {
    res.writeHead(404).end("Not found"); return;
  }
  const type = file.endsWith(".html") ? "text/html" : file.endsWith(".css") ? "text/css" : file.endsWith(".js") ? "text/javascript" : "image/svg+xml";
  let contents = readFileSync(file, "utf8");
  if (p === "/admin/theme-editor") contents = contents.replace("</body>", probe + "</body>");
  res.writeHead(200, { "content-type": type + "; charset=utf-8" }).end(contents);
});
await new Promise(resolve => server.listen(0,"127.0.0.1",resolve));
const viewportWidth = Number(process.env.FNF_AUDIT_WIDTH || 1440);
const address = "http://127.0.0.1:" + server.address().port + "/admin/theme-editor?slug=shop";
let dom;
try {
  ({ stdout: dom } = await run(chrome, [
    "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
    "--virtual-time-budget=7000", "--dump-dom", "--window-size="+viewportWidth+",1000", address
  ], {encoding:"utf8",maxBuffer:1<<23,timeout:55000}));
} finally {
  server.close();
}
const m = dom.match(/<pre id="fnf-audit-result">([^<]+)<\/pre>/);
if (!m) {
  console.error("FAIL: editor did not render a probe; inspect Chrome console/network");
  process.exit(1);
}
const decoded = m[1]
  .replaceAll("&quot;", '"')
  .replaceAll("&amp;", "&")
  .replaceAll("&lt;","<")
  .replaceAll("&gt;",">");
const observed=JSON.parse(decoded);
console.log("SOURCE:",sourceRoot);
console.log("OBSERVED:",JSON.stringify(observed,null,2));
const foundations = [
  ["loads Shop sections",observed.loaded],
  ["Add Section control",observed.addSection],
  ["draft Save control",observed.saveDraft],
  ["intentional Publish control",observed.publish],
  ["section inspector",!!observed.inspector && observed.inspector !== "Section"],
  ["center preview iframe",observed.preview],
];
const gates = [
  ["global Header group visible",observed.globalHeader],
  ["global Footer group visible",observed.globalFooter],
  ["Heuristic / Revise / FNF theme choices",observed.availableThemeOptions],
  ["section tree/add controls reachable at this viewport", observed.treeVisible],
  ["no horizontal full-document clipping", !observed.fullPageOverflow],
];
for (const [name,ok] of foundations) console.log((ok?"PASS":"FAIL")+" foundation: "+name);
for (const [name,ok] of gates) console.log((ok?"PASS":"BLOCKED")+" launch gate: "+name);
if ([...foundations,...gates].some(([,ok])=>!ok)) process.exitCode=1;
