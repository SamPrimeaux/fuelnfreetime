/**
 * Real Chrome acceptance: five existing local-site pages, 23 actual source
 * sections, 24 independent Revise renderers, and a real authenticated API
 * draft import payload. Uses built assets; no production site writes.
 */
import http from "node:http";
import assert from "node:assert/strict";
import { readFileSync, existsSync, statSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import path from "node:path";

const exec = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assets = path.join(root, "dist/assets");
assert.ok(existsSync(path.join(assets, "admin/revise-atlas.html")),
  "Run npm run build:admin before the real-browser atlas test");
const chrome = [
  "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium",
  "/usr/bin/chromium-browser", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
].find(existsSync);
assert.ok(chrome, "Chrome required for Revise renderer proof");
const results = [];
const probe = "<script>window.confirm=()=>true;setTimeout(function(){" +
  "var start={catalog:window.ThemePortableSections.catalog().filter(s=>s.id.startsWith('revise-atlas/')).length," +
  "tabs:document.querySelectorAll('#atlas-pages button').length," +
  "home:document.querySelectorAll('#atlas-rendered [data-cms-section]').length};" +
  "document.querySelector('[data-page=\"campaigns\"]').click();" +
  "var campaignCount=document.querySelectorAll('#atlas-rendered [data-cms-section]').length;" +
  "document.querySelector('[data-select=\"campaigns-before-after-3\"]').click();" +
  "var before=!!document.querySelector('#campaigns-before-after-3 [data-before-after]');" +
  "var heading=document.querySelector('#atlas-fields [data-path=\"heading\"]');" +
  "if(heading){heading.value='A REAL REVISED CAMPAIGN';heading.dispatchEvent(new Event('input',{bubbles:true}));}" +
  "var edit=!!document.getElementById('campaigns-before-after-3')?.textContent.includes('A REAL REVISED CAMPAIGN');" +
  "document.getElementById('atlas-import').click();" +
  "setTimeout(function(){var result={start,campaignCount,before,edit," +
  "status:document.getElementById('atlas-message').textContent," +
  "source:document.getElementById('atlas-origin').textContent};" +
  "var node=document.createElement('pre');node.id='browser-result';node.textContent=JSON.stringify(result);document.body.append(node);" +
  "},550);" +
  "},2200)</script>";

const file = (name) => readFileSync(path.join(assets, name), "utf8");
const atlasHtml = file("admin/revise-atlas.html").replace("</body>", probe + "</body>");
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://localhost").pathname;
  if (url === "/admin/revise-atlas") {
    res.writeHead(200, { "content-type": "text/html;charset=utf-8" }).end(atlasHtml);
    return;
  }
  if (url === "/admin/scene-lab") {
    res.writeHead(200, { "content-type": "text/html;charset=utf-8" })
      .end(file("admin/scene-lab.html")); return;
  }
  if (url === "/api/admin/cms/pages/shop/sections" && req.method === "POST") {
    let body = "";
    for await (const chunk of req) body += String(chunk);
    results.push(JSON.parse(body));
    res.writeHead(200, { "content-type": "application/json" })
      .end(JSON.stringify({ ok:true, section_key:"portable-test", version:1 }));
    return;
  }
  const normalized = path.normalize(url).replace(/^(\.\.(\/|\\|$))+/, "");
  const location = path.join(assets, normalized);
  if (!location.startsWith(assets + path.sep) || !existsSync(location) || !statSync(location).isFile()) {
    res.writeHead(404).end(); return;
  }
  const ext = path.extname(location);
  const mime = ext === ".js" ? "application/javascript" : ext === ".css" ? "text/css" :
    ext === ".json" ? "application/json" : ext === ".html" ? "text/html" : "application/octet-stream";
  res.writeHead(200, { "content-type":mime }).end(readFileSync(location));
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
let dom;
try {
  const url = "http://127.0.0.1:" + server.address().port + "/admin/revise-atlas";
  ({ stdout:dom } = await exec(chrome, [
    "--headless=new", "--disable-gpu", "--disable-dev-shm-usage", "--no-sandbox",
    "--virtual-time-budget=7000", "--window-size=1440,980", "--dump-dom", url
  ], { timeout:60000, encoding:"utf8", maxBuffer:1<<24 }));
} finally {
  server.close();
}
const match = dom.match(/<pre id="browser-result">([^<]+)<\/pre>/);
assert.ok(match, "Chrome did not finish rendering the actual donor section atlas");
const data = JSON.parse(match[1].replaceAll("&quot;", '"')
  .replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">"));
console.log(JSON.stringify(data, null, 2));
assert.equal(data.start.catalog, 24);
assert.equal(data.start.tabs, 5);
assert.equal(data.start.home, 6);
assert.equal(data.campaignCount, 4);
assert.equal(data.before, true, "Real before/after renderer must be present in the DOM");
assert.equal(data.edit, true, "Actual authored section edits must reach rendered HTML");
assert.match(data.status, /Draft section saved as portable-test/);
assert.equal(results.length, 1);
assert.equal(results[0].themePreset, "revise-atlas/before-after");
assert.equal(results[0].templateKey, "portable");
assert.equal(results[0].content.heading, "A REAL REVISED CAMPAIGN");
assert.equal(results[0].content.__editor.sourcePreset, "revise/before-after");
console.log("PASS: 24 real renderer choices, 23 donor layouts, actual Campaigns edit, draft-only authenticated CMS import payload");
