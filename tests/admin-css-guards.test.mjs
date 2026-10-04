import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const staticDir = path.join(root, "apps/ecommerce-cms-agentsam/frontend/static");
const cssFiles = readdirSync(path.join(staticDir, "css")).filter((f) => f.endsWith(".css")).map((f) => path.join(staticDir, "css", f));
const files = [...cssFiles, path.join(staticDir, "login.html")];

test("single-column grids use minmax(0, 1fr), never bare 1fr (bare 1fr lets wide children push past the screen)", () => {
  const offenders = [];
  for (const f of cssFiles) {
    readFileSync(f, "utf8").split("\n").forEach((line, i) => {
      if (/grid-template-columns:\s*1fr\s*[;}]/.test(line)) offenders.push(`${path.relative(root, f)}:${i + 1}`);
    });
  }
  assert.deepEqual(offenders, []);
});

test("every 100vh declaration is followed by a 100dvh twin (mobile browser chrome)", () => {
  const offenders = [];
  for (const f of files) {
    const lines = readFileSync(f, "utf8").split("\n");
    lines.forEach((line, i) => {
      if (/100vh/.test(line) && /;\s*$/.test(line) && !/dvh/.test(lines[i + 1] || "")) offenders.push(`${path.relative(root, f)}:${i + 1}`);
    });
  }
  assert.deepEqual(offenders, []);
});

test("compact shell, touch sizing and wide tiers are defined once in console.css", () => {
  const css = readFileSync(path.join(staticDir, "css/console.css"), "utf8");
  assert.equal((css.match(/Compact shell \(<= 900px\)/g) || []).length, 1);
  assert.equal((css.match(/@media \(pointer: coarse\)/g) || []).length, 1);
  assert.match(css, /@media \(min-width: 1600px\)/);
  assert.match(css, /@media \(min-width: 2200px\)/);
});

test("pages with their own save bar hide it only while the dock is showing edit mode", () => {
  for (const [file, selector] of [
    ["product-edit.css", ".product-editor-bar"],
    ["pages.css", ".page-editor-savebar"],
    ["preferences.css", ".prefs-savebar"],
  ]) {
    const css = readFileSync(path.join(staticDir, "css", file), "utf8");
    assert.ok(css.includes(`body.admin-dock-visible.admin-dock-has-edit:not(.admin-dock-hidden) ${selector}`), `${file} should hide ${selector} only while the dock is showing (the bar is the fallback when the dock is tucked away)`);
  }
});
