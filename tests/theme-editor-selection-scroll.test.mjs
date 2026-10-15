import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const root = resolve(import.meta.dirname, "..");
const code = readFileSync(join(root, "apps/ecommerce-cms-agentsam/frontend/static/js/theme-editor.js"), "utf8");
const start = code.indexOf("  function scrollPreviewToSelection(");
const end = code.indexOf("\n  function selectSection(", start);
assert.ok(start >= 0 && end > start, "selection scrolling helper must exist");
const helper = code.slice(start, end);
const chrome = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].find(existsSync);

test("section and block tree use preview selection scrolling", () => {
  assert.match(code, /if \(scrollPreview\) scrollPreviewToSelection\(sectionKey, fieldKey, null\)/);
  assert.match(code, /if \(scrollPreview\) scrollPreviewToSelection\(sectionKey, activeFieldKey, blockId\)/);
  assert.doesNotMatch(code, /home: \['hero', 'manifesto'/);
});

test("Chrome: tree selection scrolls the storefront iframe to sections and blocks", { skip: !chrome }, () => {
  const folder = mkdtempSync(join(tmpdir(), "fnf-editor-scroll-"));
  try {
    const inner = '<!doctype html><body style="margin:0">' +
      '<section data-cms-section="hero" style="height:1100px">Hero</section>' +
      '<section data-cms-section="collections" style="height:900px">' +
      '<div data-cms-block="card1" style="height:400px">Card 1</div>' +
      '<div data-cms-block="card2" style="height:200px"><strong data-cms="card2.title">Card 2</strong></div>' +
      '</section><section data-cms-section="footer" style="height:300px">Footer</section></body>';
    const fixture = '<!doctype html><body><iframe id="theme-preview" ' +
      'style="width:500px;height:460px" srcdoc="' + inner.replaceAll('"','&quot;') + '"></iframe>' +
      '<pre id="result">WAITING</pre><script>' +
      'const byId=id=>document.getElementById(id);' + helper +
      'const frame=byId("theme-preview");frame.addEventListener("load",()=>{' +
      'try {const first=scrollPreviewToSelection("collections",null,null);' +
      'const scrolled=frame.contentWindow.scrollY;' +
      'const second=scrollPreviewToSelection("collections",null,"card2");' +
      'const blockScroll=frame.contentWindow.scrollY;' +
      'const third=scrollPreviewToSelection("not-present",null,null);' +
      'const fourth=scrollPreviewToSelection("footer",null,null);' +
      'const footerScroll=frame.contentWindow.scrollY;' +
      'document.getElementById("result").textContent=' +
      'first&&second&&!third&&fourth&&scrolled>850&&blockScroll>scrolled&&footerScroll>=blockScroll?' +
      '"PREVIEW_SCROLL_PASS":"PREVIEW_SCROLL_FAIL "+JSON.stringify({first,second,third,fourth,scrolled,blockScroll,footerScroll});' +
      '}catch(e){document.getElementById("result").textContent="PREVIEW_SCROLL_ERROR "+e.message;}' +
      '});</script></body>';
    const file = join(folder, "fixture.html");
    writeFileSync(file, fixture);
    const result = spawnSync(chrome, [
      "--headless=new", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage",
      "--virtual-time-budget=1800", "--window-size=1250,900",
      "--user-data-dir=" + join(folder,"profile"), "--dump-dom", pathToFileURL(file).href,
    ], { encoding:"utf8", timeout:18000, maxBuffer:2000000 });
    assert.equal(result.error, undefined, result.error?.message);
    assert.match(result.stdout||"", /PREVIEW_SCROLL_PASS/, (result.stdout||result.stderr).slice(-1800));
  } finally {rmSync(folder,{recursive:true,force:true});}
});
