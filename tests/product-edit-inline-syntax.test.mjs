import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Script } from "node:vm";

test("legacy Product Details inline JavaScript parses until TSX migration", () => {
  const html = readFileSync("apps/ecommerce-cms-agentsam/frontend/static/product-edit.html", "utf8");
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
    .map(match => match[1]).filter(code => code.trim());
  assert.ok(scripts.length > 0, "product-edit.html must contain an inline entrypoint");
  for (const code of scripts) assert.doesNotThrow(() => new Script(code, { filename: "product-edit.html:inline" }));
});
