#!/usr/bin/env node
/**
 * Extraction ratchet for apps/ecommerce-cms-agentsam.
 *
 * The app is being packaged as it is built. Every runtime import that leaves the app tree is
 * a piece of extraction work, so the allowed set is recorded in
 * apps/ecommerce-cms-agentsam/extraction.baseline.json and may only shrink:
 *   - a NEW out-of-tree import fails the check (stop coupling to the repo root)
 *   - a baseline entry that no longer exists fails too (remove it; the ratchet moves down)
 *
 *   node scripts/app-extraction-boundary.mjs [--check|--write|--stdout]
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appRel = "apps/ecommerce-cms-agentsam";
const baselinePath = path.join(root, appRel, "extraction.baseline.json");
const SKIP_DIRS = new Set(["node_modules", "tests", "dist", ".wrangler", "analytics"]);
const SOURCE = /\.(?:m?js|tsx?)$/;
const SPECIFIER = [
  /\b(?:import|export)\s+(?:[^'";]*?\s+from\s+)?["']([^"']+)["']/g,
  /\bimport\(\s*["']([^"']+)["']\s*\)/g,
  /\brequire\(\s*["']([^"']+)["']\s*\)/g,
];

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = path.join(dir, name);
    const info = statSync(full);
    if (info.isDirectory()) yield* walk(full);
    else if (SOURCE.test(name)) yield full;
  }
}

/** Every relative runtime import that resolves outside the app tree: "file -> target". */
export function outOfTreeImports() {
  const appDir = path.join(root, appRel);
  const found = new Set();
  for (const file of walk(appDir)) {
    const text = readFileSync(file, "utf8");
    for (const pattern of SPECIFIER) {
      for (const match of text.matchAll(pattern)) {
        const specifier = match[1];
        if (!specifier.startsWith(".")) continue;
        const target = path.resolve(path.dirname(file), specifier);
        if (target === appDir || target.startsWith(appDir + path.sep)) continue;
        found.add(`${path.relative(root, file)} -> ${path.relative(root, target)}`);
      }
    }
  }
  return [...found].sort();
}

export function readBaseline() {
  return JSON.parse(readFileSync(baselinePath, "utf8")).allowed;
}

export function compareToBaseline(current = outOfTreeImports(), baseline = readBaseline()) {
  const have = new Set(current), allowed = new Set(baseline);
  return {
    added: current.filter((entry) => !allowed.has(entry)),
    resolved: baseline.filter((entry) => !have.has(entry)),
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const current = outOfTreeImports();
  const mode = process.argv[2] || "--check";
  if (mode === "--stdout") console.log(current.join("\n"));
  else if (mode === "--write") {
    writeFileSync(baselinePath, JSON.stringify({ schema: "agentsam.extraction-baseline.v1", app: appRel, allowed: current }, null, 2) + "\n");
    console.log(`Wrote ${current.length} allowed out-of-tree imports`);
  } else {
    const { added, resolved } = compareToBaseline(current);
    for (const entry of added) console.error(`NEW out-of-tree import: ${entry}`);
    for (const entry of resolved) console.error(`RESOLVED, remove from baseline (run --write): ${entry}`);
    console.log(`${current.length} out-of-tree imports remain (target 0)`);
    process.exit(added.length || resolved.length ? 1 : 0);
  }
}
