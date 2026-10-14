import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// A clean clone must carry no one's Cloudflare ids or personal addresses in code, seeds or scripts.
// Per-deployment ids live in that deployment's wrangler.toml and environment, never in these paths.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCOPES = [
  { dir: "apps/ecommerce-cms-agentsam/backend", file: /\.(?:js|mjs|ts)$/ },
  { dir: "packages/fnf-theme/src", file: /\.(?:js|mjs|ts)$/ },
  { dir: "scripts", file: /\.(?:mjs|js|sh)$/ },
  { dir: "db", file: /^(?:seed|patch)-.*\.sql$/ },
];
const QUOTED_ID = /['"`][0-9a-f]{32}['"`]/; // Cloudflare account, zone and KV namespace ids are 32 hex chars
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}/;

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else yield full;
  }
}
function scan(pattern, { skip = () => false } = {}) {
  const hits = [];
  for (const scope of SCOPES) {
    for (const file of walk(path.join(root, scope.dir))) {
      if (!scope.file.test(path.basename(file))) continue;
      fs.readFileSync(file, "utf8").split("\n").forEach((line, i) => {
        if (pattern.test(line) && !skip(line)) hits.push(path.relative(root, file) + ":" + (i + 1));
      });
    }
  }
  return hits;
}

test("no Cloudflare account, zone or namespace id is baked into code, seeds or scripts", () => {
  assert.deepEqual(scan(QUOTED_ID), []);
});

test("no 32-hex account id is embedded in seed SQL text, JSON or comments", () => {
  const hits = [];
  for (const file of walk(path.join(root, "db"))) {
    if (!/^(?:seed|patch)-.*\.sql$/.test(path.basename(file))) continue;
    fs.readFileSync(file, "utf8").split("\n").forEach((line, i) => {
      if (/\b[0-9a-f]{32}\b/.test(line)) hits.push(path.relative(root, file) + ":" + (i + 1));
    });
  }
  assert.deepEqual(hits, []);
});

test("backend source contains no email addresses (people and mailboxes are install data)", () => {
  const backend = SCOPES.filter((s) => s.dir.endsWith("/backend"));
  const hits = [];
  for (const scope of backend) {
    for (const file of walk(path.join(root, scope.dir))) {
      if (!scope.file.test(path.basename(file))) continue;
      fs.readFileSync(file, "utf8").split("\n").forEach((line, i) => {
        if (EMAIL.test(line) && !/@example\./.test(line)) hits.push(path.relative(root, file) + ":" + (i + 1));
      });
    }
  }
  assert.deepEqual(hits, []);
});
