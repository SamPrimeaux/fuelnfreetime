#!/usr/bin/env node
/**
 * Vendor Cloudflare agent skills into .cursor/skills/ for AgentSam R2+D1 sync.
 * Sources (first match wins):
 *   1. Cursor Cloudflare plugin cache
 *   2. ~/.cursor/skills (wrangler --install-skills target)
 *
 * Usage: node scripts/install-cloudflare-skills.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const DEST = path.join(REPO_ROOT, ".cursor/skills");

const SKILL_DIRS = [
  "cloudflare",
  "wrangler",
  "workers-best-practices",
  "durable-objects",
  "agents-sdk",
  "building-mcp-server-on-cloudflare",
  "building-ai-agent-on-cloudflare",
  "web-perf",
];

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

function findPluginSkillsRoot() {
  const base = path.join(process.env.HOME || "", ".cursor/plugins/cache/cursor-public/cloudflare");
  if (!fs.existsSync(base)) return null;
  const versions = fs.readdirSync(base).filter((d) => fs.statSync(path.join(base, d)).isDirectory());
  for (const ver of versions.sort().reverse()) {
    const skills = path.join(base, ver, "skills");
    if (fs.existsSync(skills)) return skills;
  }
  return null;
}

function resolveSource(skill) {
  const plugin = findPluginSkillsRoot();
  if (plugin) {
    const p = path.join(plugin, skill);
    if (fs.existsSync(p)) return p;
  }
  const user = path.join(process.env.HOME || "", ".cursor/skills", skill);
  if (fs.existsSync(user)) return user;
  return null;
}

function main() {
  fs.mkdirSync(DEST, { recursive: true });
  let copied = 0;

  for (const skill of SKILL_DIRS) {
    const src = resolveSource(skill);
    if (!src) {
      console.warn(`skip ${skill} — not found in plugin cache or ~/.cursor/skills`);
      continue;
    }
    const dest = path.join(DEST, skill);
    if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true });
    copyDir(src, dest);
    console.log(`✓ ${skill} ← ${src}`);
    copied += 1;
  }

  if (!copied) {
    console.error("No Cloudflare skills copied. Run: npx wrangler deploy --install-skills --dry-run");
    process.exit(1);
  }

  console.log(`\nInstalled ${copied} Cloudflare skill(s) under .cursor/skills/`);
  console.log("Next: npm run agentsam:skills:sync");
}

main();
