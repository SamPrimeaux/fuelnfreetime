import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const root = "../apps/ecommerce-cms-agentsam/frontend/static/";
const read = (p) => readFileSync(new URL(root + p, import.meta.url), "utf8");

test("home uses real storefront preview and canonical editor, not promotion or fake artwork", () => {
  const home = read("home.html");
  assert.match(home, /class="fnf-site-preview"/);
  assert.match(home, /iframe src="\/"/);
  assert.match(home, /href="\/admin\/theme-editor\?slug=home"/);
  assert.match(home, /Customize Theme/);
  assert.doesNotMatch(home, /3 months|subscription offer|TIME IS THE|HORSEPOWER/);
  assert.match(home, /\/api\/admin\/overview/);
});

test("home composer is the single launch into existing AgentSam backend", () => {
  const home = read("home.html");
  const js = read("js/home-workspace.js");
  assert.match(home, /id="home-agent-form"/);
  assert.match(home, /id="home-agent-plus"/);
  assert.match(home, /data-home-suggestion/);
  assert.match(js, /window\.sendAgentsamMessage\(prompt/);
  assert.match(js, /window\.focusAgentsamDrawer/);
  assert.doesNotMatch(js, /fetch\("\/api\/admin\/agentsam\/chat"/);
});

test("capability menu is shared by home and chat and does not pretend plugins are ChatGPT sessions", () => {
  const menu = read("js/agent-composer-menu.js");
  const drawer = read("js/agentsam.js");
  assert.match(menu, /window\.AgentSamComposerMenu/);
  for (const label of ["Files", "Upload from device", "Target", "Mention", "Skills", "Apps"]) {
    assert.ok(menu.includes(label), "Missing " + label);
  }
  assert.match(menu, /\/api\/admin\/agentsam\/skills/);
  assert.match(menu, /\/api\/admin\/agentsam\/status/);
  assert.match(menu, /image_base64/);
  assert.match(menu, /text_content/);
  assert.match(menu, /connected/);
  assert.match(menu, /ChatGPT plugin authorization and FNF app authorization are separate/);
  assert.match(drawer, /mountAgentSamCapabilityMenu/);
  assert.match(drawer, /context: buildAgentsamContext/);
  assert.match(drawer, /attachments/);
});

test("side and focus modes preserve conversation and prevent a floating-modal expansion", () => {
  const drawer = read("js/agentsam.js");
  const css = read("css/agentsam.css");
  assert.match(drawer, /document\.body\.classList\.toggle\("agentsam-focus-mode", focused\)/);
  assert.match(drawer, /drawerConversationId/);
  assert.match(drawer, /preserve draft and attachments/i);
  assert.match(css, /body\.agentsam-focus-mode \.console-main\{display:none\}/);
  assert.match(css, /position:static;display:flex;flex:1 1 auto;width:100%;height:100%/);
  assert.match(css, /overscroll-behavior:contain/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
});

test("UI JavaScript parses and new responsive CSS does not violate the grid guard", () => {
  for (const name of ["agent-composer-menu.js", "home-workspace.js", "agentsam.js"]) {
    const file = new URL(root + "js/" + name, import.meta.url);
    const r = spawnSync(process.execPath, ["--check", file.pathname], { encoding: "utf8" });
    assert.equal(r.status, 0, name + ": " + r.stderr);
  }
  const css = read("css/home-workspace.css");
  assert.doesNotMatch(css, /grid-template-columns:\s*1fr\s*[;}]/);
  assert.match(css, /max-width:620px/);
  assert.match(css, /focus-within/);
});
