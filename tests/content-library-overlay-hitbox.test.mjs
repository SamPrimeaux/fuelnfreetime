import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const css = await readFile(
  new URL("../apps/ecommerce-cms-agentsam/frontend/static/css/brand-workspace.css", import.meta.url),
  "utf8",
);
const html = await readFile(
  new URL("../apps/ecommerce-cms-agentsam/frontend/static/content.html", import.meta.url),
  "utf8",
);
const js = await readFile(
  new URL("../apps/ecommerce-cms-agentsam/frontend/static/js/brand-workspace.js", import.meta.url),
  "utf8",
);

test("closed brand picker cannot intercept Content library pointer events", () => {
  assert.match(css, /\.brand-picker\[hidden\]\s*\{[\s\S]*display:\s*none\s*!important/);
  assert.match(css, /\.brand-picker\s*\{[\s\S]*visibility:\s*hidden;[\s\S]*pointer-events:\s*none;/);
  assert.match(css, /\.brand-picker\.is-open\s*\{[\s\S]*visibility:\s*visible;[\s\S]*pointer-events:\s*auto;/);
});

test("brand picker starts inert and hidden, and toggles interaction state explicitly", () => {
  assert.match(
    html,
    /id="brand-picker"[^>]*aria-hidden="true"[^>]*hidden[^>]*inert/,
  );
  assert.match(js, /picker\.hidden\s*=\s*false/);
  assert.match(js, /picker\.inert\s*=\s*false/);
  assert.match(js, /picker\.setAttribute\("aria-hidden",\s*"false"\)/);
  assert.match(js, /picker\.inert\s*=\s*true/);
  assert.match(js, /picker\.setAttribute\("aria-hidden",\s*"true"\)/);
});

test("media cards remain pointer-first but expose keyboard activation", async () => {
  const mediaJs = await readFile(
    new URL("../apps/ecommerce-cms-agentsam/frontend/static/js/media-library.js", import.meta.url),
    "utf8",
  );
  const mediaCss = await readFile(
    new URL("../apps/ecommerce-cms-agentsam/frontend/static/css/media-library.css", import.meta.url),
    "utf8",
  );
  assert.match(mediaJs, /tabindex="0" role="button"/);
  assert.match(mediaJs, /mountListener\(els\.grid, "keydown"/);
  assert.match(mediaCss, /\.media-item\s*\{[\s\S]*cursor:\s*pointer;/);
  assert.match(mediaCss, /\.media-item\.is-sortable\s*\{[\s\S]*cursor:\s*grab;/);
});
