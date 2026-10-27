import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (file) => readFileSync(new URL("../" + file, import.meta.url), "utf8");

test("persistent mobile navigation is dismissible without changing desktop preference", () => {
  const shell = read("apps/ecommerce-cms-agentsam/frontend/shell.js");
  const css = read("apps/ecommerce-cms-agentsam/frontend/static/css/console.css");
  assert.match(shell, /data-console-nav-dismiss/);
  assert.match(shell, /addEventListener\("click", dismiss, \{ signal \}\)/);
  assert.match(shell, /touchstart/);
  assert.match(shell, /touchend/);
  assert.match(shell, /dx < -65 && Math\.abs\(dx\) > Math\.abs\(dy\) \* 1\.4/);
  assert.match(shell, /mq\.matches \? false : savedDesktopOpen\(\)/);
  assert.match(shell, /if \(!mobile\) \{/);
  assert.match(css, /body\.console-nav-mobile-open \.console-nav-backdrop/);
});

test("content library exposes existing album CRUD, cover selection, and no duplicate asset writes", () => {
  const html = read("apps/ecommerce-cms-agentsam/frontend/static/content.html");
  const js = read("apps/ecommerce-cms-agentsam/frontend/static/js/media-library.js");
  const backend = read("apps/ecommerce-cms-agentsam/backend/admin/media.js");
  assert.match(html, /id="media-album-name"/);
  assert.match(html, /id="media-album-delete"/);
  assert.match(js, /data-media-album-edit/);
  assert.match(js, /method: editing \? "PATCH" : "POST"/);
  assert.match(js, /data-media-batch="album-cover"/);
  assert.match(js, /cover_media_asset_id: Number\(assetId\)/);
  assert.match(js, /action === "remove-album"/);
  assert.match(backend, /cover asset must belong to album/);
  assert.match(backend, /SELECT 1 AS ok FROM media_album_assets/);
  assert.match(backend, /UPDATE media_albums SET slug=/);
});

test("content mobile search and primary actions remain visible with optional advanced controls", () => {
  const html = read("apps/ecommerce-cms-agentsam/frontend/static/content.html");
  const css = read("apps/ecommerce-cms-agentsam/frontend/static/css/media-library.css");
  const advanced = html.indexOf('id="media-advanced-controls"');
  const uploadIntent = html.indexOf('id="media-upload-intent"');
  const controlsEnd = html.indexOf('id="media-file-input"');
  assert.ok(advanced > -1 && uploadIntent > advanced && uploadIntent < controlsEnd);
  assert.match(css, /#content-view-library \.media-lib-advanced-controls \.media-upload-intent-label/);
  assert.match(css, /@media \(max-width: 390px\)/);
  assert.match(html, /id="media-upload-btn"/);
  assert.match(html, /id="media-gallery-new"/);
});
