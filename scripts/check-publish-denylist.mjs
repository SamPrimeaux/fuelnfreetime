#!/usr/bin/env node
/**
 * Fails when a package that could be published contains customer identity.
 * Packs each non-private package (npm pack --dry-run), then scans every file name and
 * file content in the tarball against publish-denylist.json. Node stdlib only.
 *
 *   node scripts/check-publish-denylist.mjs                 # all non-private packages
 *   node scripts/check-publish-denylist.mjs --package packages/fnf-theme
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function loadPatterns(file = path.join(root, "publish-denylist.json")) {
  return JSON.parse(readFileSync(file, "utf8")).patterns.map((p) => ({ id: p.id, re: new RegExp(p.regex, p.flags || "") }));
}

export function scanText(text, patterns) {
  const hits = [];
  text.split("\n").forEach((line, i) => {
    for (const p of patterns) if (p.re.test(line)) hits.push({ id: p.id, line: i + 1 });
  });
  return hits;
}

export function packedFiles(dir) {
  const out = execFileSync("npm", ["pack", "--dry-run", "--json", "--silent"], { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  return JSON.parse(out)[0].files.map((f) => f.path);
}

export function checkPackage(dir, patterns = loadPatterns()) {
  const failures = [];
  for (const rel of packedFiles(dir)) {
    for (const p of patterns) if (p.re.test(rel)) failures.push(`${rel}: file name matches ${p.id}`);
    const abs = path.join(dir, rel);
    if (!existsSync(abs) || statSync(abs).size > 2_000_000) continue;
    const buf = readFileSync(abs);
    if (buf.includes(0)) continue; // binary
    for (const h of scanText(buf.toString("utf8"), patterns)) failures.push(`${rel}:${h.line}: ${h.id}`);
  }
  return failures;
}

export function publishablePackages() {
  const dirs = [];
  for (const base of ["packages", "apps"]) {
    const b = path.join(root, base);
    if (!existsSync(b)) continue;
    for (const name of readdirSync(b)) {
      const pj = path.join(b, name, "package.json");
      if (existsSync(pj) && JSON.parse(readFileSync(pj, "utf8")).private !== true) dirs.push(path.join(b, name));
    }
  }
  return dirs;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const i = process.argv.indexOf("--package");
  const dirs = i > -1 ? [path.resolve(process.argv[i + 1])] : publishablePackages();
  const patterns = loadPatterns();
  let bad = 0;
  for (const dir of dirs) {
    const name = JSON.parse(readFileSync(path.join(dir, "package.json"), "utf8")).name;
    const failures = checkPackage(dir, patterns);
    if (failures.length) {
      bad++;
      const shown = failures.slice(0, 8);
      console.error(`FAIL ${name} (${failures.length} hit${failures.length === 1 ? "" : "s"})\n` + shown.map((f) => "  " + f).join("\n") + (failures.length > shown.length ? `\n  ... +${failures.length - shown.length} more` : ""));
    } else console.log(`ok   ${name}`);
  }
  process.exit(bad ? 1 : 0);
}
