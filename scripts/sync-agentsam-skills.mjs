#!/usr/bin/env node
/**
 * Upload .cursor/skills markdown → R2 agentsam/skills/
 * Upsert agentsam_skill + agentsam_skill_file rows from SKILL.md frontmatter.
 *
 * Usage:
 *   node scripts/sync-agentsam-skills.mjs
 *   node scripts/sync-agentsam-skills.mjs --dry-run
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const SKILLS_SRC = path.join(REPO_ROOT, ".cursor/skills");
const R2_PREFIX = "agentsam/skills";
const BUCKET = "fuelnfreetime";
const TENANT_ID = "tenant_fuelnfreetime";
const WORKSPACE_ID = "ws_fuelnfreetime";
const SYSTEM_USER_ID = "au_fnf_system";
const DRY_RUN = process.argv.includes("--dry-run");

function sh(cmd) {
  if (DRY_RUN) {
    console.log("[dry-run]", cmd);
    return "";
  }
  return execSync(cmd, { cwd: REPO_ROOT, encoding: "utf8", stdio: ["pipe", "pipe", "inherit"] });
}

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) return { meta: {}, body: content };

  const meta = {};
  for (const line of match[1].split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf(":");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (val === ">-" || val === "|") continue;
    meta[key] = val;
  }
  return { meta, body: content.slice(match[0].length) };
}

function slugToId(slug) {
  return `skill_${String(slug).replace(/-/g, "_")}`;
}

function inferSkillDomain(slug, description = "") {
  const s = `${slug} ${description}`.toLowerCase();
  if (s.includes("stripe") || s.includes("payment") || s.includes("checkout")) return "stripe";
  if (s.includes("commerce") || s.includes("product") || s.includes("inventory")) return "commerce";
  if (
    s.includes("cloudflare") ||
    s.includes("worker") ||
    s.includes("wrangler") ||
    s.includes("durable") ||
    s.includes("agents-sdk") ||
    s.includes("mcp-server") ||
    s.includes("web-perf") ||
    s.includes("d1") ||
    s.includes("r2")
  ) {
    return "cloudflare";
  }
  return "platform";
}

function inferTags(slug, domain) {
  const tags = [slug.replace(/-/g, "_")];
  if (domain === "stripe") tags.push("stripe", "payments", "checkout", "webhooks");
  if (domain === "commerce") tags.push("commerce", "products", "inventory", "orders");
  if (domain === "cloudflare") {
    tags.push(
      "cloudflare",
      "workers",
      "wrangler",
      "d1",
      "r2",
      "kv",
      "durable_objects",
      "workers_ai",
      "deploy",
      "mcp"
    );
  }
  return [...new Set(tags)];
}

const ALWAYS_APPLY_SLUGS = new Set(["fnf-cloudflare-runtime"]);

function inferTaskTypes(domain, slug) {
  if (domain === "stripe") return ["stripe", "payments", "commerce"];
  if (domain === "commerce") return ["commerce", "products", "inventory", "orders"];
  if (domain === "cloudflare") {
    return [
      "cloudflare",
      "workers",
      "deploy",
      "d1",
      "r2",
      "kv",
      "durable_objects",
      "workers_ai",
      "mcp",
      "repo_work",
    ];
  }
  return ["platform"];
}

function inferSortOrder(domain, slug) {
  if (slug === "fnf-cloudflare-runtime") return 1;
  if (domain === "commerce") return 5;
  if (domain === "stripe") return 10;
  if (domain === "cloudflare") return 8;
  return 20;
}

function walkMarkdownFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkMarkdownFiles(full));
    else if (entry.isFile() && entry.name.endsWith(".md")) out.push(full);
  }
  return out;
}

function discoverSkills() {
  const skills = [];
  if (!fs.existsSync(SKILLS_SRC)) return skills;

  for (const entry of fs.readdirSync(SKILLS_SRC, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillDir = path.join(SKILLS_SRC, entry.name);
    const skillMd = path.join(skillDir, "SKILL.md");
    if (!fs.existsSync(skillMd)) continue;

    const slug = entry.name;
    const content = fs.readFileSync(skillMd, "utf8");
    const { meta } = parseFrontmatter(content);
    const name = meta.name || slug;
    const description = (meta.description || "").replace(/\s+/g, " ").trim();

    const files = walkMarkdownFiles(skillDir).map((abs) => {
      const rel = path.relative(skillDir, abs).replace(/\\/g, "/");
      const role = rel === "SKILL.md" ? "skill" : rel.startsWith("references/") ? "reference" : "asset";
      return {
        rel,
        abs,
        r2Key: `${R2_PREFIX}/${slug}/${rel}`,
        role,
      };
    });

    const domain = inferSkillDomain(slug, description);

    skills.push({
      slug,
      id: slugToId(slug),
      name,
      description,
      domain,
      tags: inferTags(slug, domain),
      mainR2Key: `${R2_PREFIX}/${slug}/SKILL.md`,
      files,
    });
  }

  return skills.sort((a, b) => a.slug.localeCompare(b.slug));
}

function uploadFile(localPath, r2Key) {
  const quoted = `"${localPath.replace(/"/g, '\\"')}"`;
  const cmd = `./scripts/with-cf-admin-env.sh npx wrangler r2 object put ${BUCKET}/${r2Key} --file ${quoted} --content-type "text/markdown; charset=utf-8" --remote`;
  sh(cmd);
}

function inferRouteKeys(domain, slug, taskTypes = []) {
  const keys = [];
  if (domain === "stripe") {
    keys.push({ intent: "commerce", task_type: "store_ops" }, { workflow_key: "fnf_agentsam_chat", task_type: "commerce" });
  } else if (domain === "commerce") {
    keys.push({ intent: "commerce", task_type: "store_ops" }, { route_key: "commerce" });
  } else if (domain === "cloudflare") {
    keys.push({ intent: "code", task_type: "repo_work" }, { route_key: "code" });
  }
  if (slug === "fnf-cloudflare-runtime") {
    keys.push({ intent: "code" }, { task_type: "repo_work" });
  }
  for (const t of taskTypes.slice(0, 3)) {
    keys.push({ task_type: t });
  }
  return keys;
}

function contentHash(text) {
  return crypto.createHash("sha256").update(String(text || ""), "utf8").digest("hex");
}

function parseD1Json(raw) {
  try {
    const parsed = JSON.parse(String(raw || "[]"));
    if (Array.isArray(parsed) && parsed[0]?.results) return parsed[0].results;
    if (parsed?.results) return parsed.results;
    return [];
  } catch {
    return [];
  }
}

function fetchExistingSkills() {
  if (DRY_RUN) return [];
  try {
    const out = sh(
      `./scripts/with-cf-admin-env.sh npx wrangler d1 execute fuelnfreetime --remote --command "SELECT id, slug, version, metadata_json FROM agentsam_skill" --json`
    );
    return parseD1Json(out);
  } catch {
    return [];
  }
}

function revisionInsertSql({ skillId, contentHashValue, contentMarkdown, version }) {
  return `INSERT INTO agentsam_skill_revision (skill_id, tenant_id, workspace_id, content_hash, content_markdown, version, source)
VALUES ('${sqlEscape(skillId)}', '${TENANT_ID}', '${WORKSPACE_ID}', '${sqlEscape(contentHashValue)}', '${sqlEscape(contentMarkdown.slice(0, 8000))}', ${version}, 'skills_sync');`;
}

function skillInsertSql({
  id,
  slug,
  name,
  description,
  filePath,
  domain,
  slashTrigger,
  tags,
  globs,
  taskTypes,
  routeKeys,
  metadata,
  sortOrder,
  version = 1,
  alwaysApply = false,
}) {
  return `INSERT OR REPLACE INTO agentsam_skill (
  id, tenant_id, user_id, workspace_id, slug, name, description, content_markdown,
  file_path, scope, slash_trigger, globs, always_apply, task_types_json, route_keys_json,
  model_constraints_json, access_mode, tags_json, metadata_json, retrieval_strategy,
  sort_order, version, is_active, updated_at
) VALUES (
  '${sqlEscape(id)}',
  '${TENANT_ID}',
  '${SYSTEM_USER_ID}',
  '${WORKSPACE_ID}',
  '${sqlEscape(slug)}',
  '${sqlEscape(name)}',
  '${sqlEscape(description)}',
  '',
  '${sqlEscape(filePath)}',
  'tenant',
  '${sqlEscape(slashTrigger || slug)}',
  '${sqlEscape(JSON.stringify(globs || []))}',
  ${alwaysApply ? 1 : 0},
  '${sqlEscape(JSON.stringify(taskTypes || []))}',
  '${sqlEscape(JSON.stringify(routeKeys || []))}',
  '{}',
  'read_only',
  '${sqlEscape(JSON.stringify(tags || []))}',
  '${sqlEscape(JSON.stringify(metadata || {}))}',
  'r2',
  ${sortOrder},
  ${version},
  1,
  datetime('now')
);`;
}

function sqlEscape(s) {
  return String(s ?? "").replace(/'/g, "''");
}

function buildSeedSql(skills, existingBySlug = new Map()) {
  const lines = ["-- Generated by scripts/sync-agentsam-skills.mjs", ""];

  for (const skill of skills) {
    const skillMd = skill.files.find((f) => f.rel === "SKILL.md");
    const body = skillMd && fs.existsSync(skillMd.abs) ? fs.readFileSync(skillMd.abs, "utf8") : "";
    const hash = contentHash(body);
    const prev = existingBySlug.get(skill.slug);
    let version = prev?.version ? Number(prev.version) : 1;
    let prevHash = "";
    try {
      prevHash = prev?.metadata_json ? JSON.parse(prev.metadata_json)?.content_hash || "" : "";
    } catch {
      prevHash = "";
    }
    const changed = prevHash && prevHash !== hash;
    if (changed) version += 1;
    if (!prevHash && !prev) version = 1;

    const metadata = {
      r2_bucket: BUCKET,
      r2_skill_key: skill.mainR2Key,
      source: ".cursor/skills",
      skill_domain: skill.domain,
      content_hash: hash,
    };
    const taskTypes = inferTaskTypes(skill.domain, skill.slug);
    const routeKeys = inferRouteKeys(skill.domain, skill.slug, taskTypes);

    lines.push(
      skillInsertSql({
        id: skill.id,
        slug: skill.slug,
        name: skill.name,
        description: skill.description,
        filePath: skill.mainR2Key,
        domain: skill.domain,
        slashTrigger: skill.slug,
        tags: skill.tags,
        globs:
          skill.domain === "cloudflare"
            ? ["wrangler.toml", "src/**/*.js", "docs/AGENTSAM-SKILLS.md"]
            : [],
        taskTypes,
        routeKeys,
        metadata,
        sortOrder: inferSortOrder(skill.domain, skill.slug),
        version,
        alwaysApply: ALWAYS_APPLY_SLUGS.has(skill.slug),
      })
    );

    if (changed || (!prevHash && body)) {
      lines.push(
        revisionInsertSql({
          skillId: skill.id,
          contentHashValue: hash,
          contentMarkdown: body,
          version,
        })
      );
    }
    lines.push("");

    lines.push(`DELETE FROM agentsam_skill_file WHERE skill_id = '${sqlEscape(skill.id)}';`);

    let order = 0;
    for (const file of skill.files) {
      if (file.role === "skill") continue;
      lines.push(`INSERT INTO agentsam_skill_file (skill_id, file_path, role, sort_order)
VALUES ('${sqlEscape(skill.id)}', '${sqlEscape(file.r2Key)}', '${sqlEscape(file.role)}', ${order++});`);
    }
    lines.push("");
  }

  const commerceDoc = path.join(REPO_ROOT, "docs/RUNTIME-CONTRACTS-COMMERCE.md");
  const commerceBody = fs.existsSync(commerceDoc) ? fs.readFileSync(commerceDoc, "utf8") : "";
  const commerceHash = contentHash(commerceBody);
  const commercePrev = existingBySlug.get("fnf-commerce-runtime");
  let commerceVersion = commercePrev?.version ? Number(commercePrev.version) : 1;
  try {
    const ph = commercePrev?.metadata_json ? JSON.parse(commercePrev.metadata_json)?.content_hash : "";
    if (ph && ph !== commerceHash) commerceVersion += 1;
  } catch {
    /* ignore */
  }

  lines.push(
    skillInsertSql({
      id: "skill_fnf_commerce_runtime",
      slug: "fnf-commerce-runtime",
      name: "FNF commerce runtime contract",
      description:
        "Fuel & Free Time product, inventory, cart, checkout, and order rules from RUNTIME-CONTRACTS-COMMERCE.md.",
      filePath: `${R2_PREFIX}/fnf-commerce-runtime/SKILL.md`,
      domain: "commerce",
      slashTrigger: "commerce",
      tags: ["commerce", "products", "inventory", "orders", "checkout"],
      globs: ["docs/RUNTIME-CONTRACTS-COMMERCE.md", "src/store/**", "src/admin/api.js"],
      taskTypes: ["commerce", "products", "inventory", "orders"],
      routeKeys: inferRouteKeys("commerce", "fnf-commerce-runtime", ["commerce", "store_ops"]),
      metadata: {
        r2_bucket: BUCKET,
        r2_skill_key: `${R2_PREFIX}/fnf-commerce-runtime/SKILL.md`,
        source: "docs",
        skill_domain: "commerce",
        content_hash: commerceHash,
      },
      sortOrder: 5,
      version: commerceVersion,
      alwaysApply: false,
    })
  );
  if (commerceBody) {
    lines.push(
      revisionInsertSql({
        skillId: "skill_fnf_commerce_runtime",
        contentHashValue: commerceHash,
        contentMarkdown: commerceBody,
        version: commerceVersion,
      })
    );
  }

  const stripeDoc = path.join(REPO_ROOT, "docs/RUNTIME-CONTRACTS-STRIPE.md");
  const stripeBody = fs.existsSync(stripeDoc) ? fs.readFileSync(stripeDoc, "utf8") : "";
  const stripeHash = contentHash(stripeBody);
  const stripePrev = existingBySlug.get("fnf-stripe-runtime");
  let stripeVersion = stripePrev?.version ? Number(stripePrev.version) : 1;
  try {
    const ph = stripePrev?.metadata_json ? JSON.parse(stripePrev.metadata_json)?.content_hash : "";
    if (ph && ph !== stripeHash) stripeVersion += 1;
  } catch {
    /* ignore */
  }

  lines.push(
    skillInsertSql({
      id: "skill_fnf_stripe_runtime",
      slug: "fnf-stripe-runtime",
      name: "FNF Stripe implementation checklist",
      description: "Ordered Stripe Checkout tasks and inventory rules for Fuel & Free Time.",
      filePath: `${R2_PREFIX}/fnf-stripe-runtime/SKILL.md`,
      domain: "stripe",
      slashTrigger: "stripe",
      tags: ["stripe", "checkout", "webhooks", "payments"],
      globs: ["docs/RUNTIME-CONTRACTS-STRIPE.md", ".cursor/skills/stripe-best-practices/**"],
      taskTypes: ["stripe", "payments", "commerce"],
      routeKeys: inferRouteKeys("stripe", "fnf-stripe-runtime", ["stripe", "payments"]),
      metadata: {
        r2_bucket: BUCKET,
        r2_skill_key: `${R2_PREFIX}/fnf-stripe-runtime/SKILL.md`,
        source: "docs",
        skill_domain: "stripe",
        content_hash: stripeHash,
      },
      sortOrder: 6,
      version: stripeVersion,
      alwaysApply: false,
    })
  );
  if (stripeBody) {
    lines.push(
      revisionInsertSql({
        skillId: "skill_fnf_stripe_runtime",
        contentHashValue: stripeHash,
        contentMarkdown: stripeBody,
        version: stripeVersion,
      })
    );
  }

  return lines.join("\n");
}

function main() {
  const skills = discoverSkills();
  if (!skills.length) {
    console.error("No skills found under", SKILLS_SRC);
    process.exit(1);
  }

  console.log(`Found ${skills.length} skill(s) in .cursor/skills/`);

  for (const skill of skills) {
    for (const file of skill.files) {
      console.log(`PUT r2://${BUCKET}/${file.r2Key}`);
      uploadFile(file.abs, file.r2Key);
    }
  }

  // FNF commerce runtime skill from docs
  const commerceDoc = path.join(REPO_ROOT, "docs/RUNTIME-CONTRACTS-COMMERCE.md");
  const commerceKey = `${R2_PREFIX}/fnf-commerce-runtime/SKILL.md`;
  if (fs.existsSync(commerceDoc)) {
    console.log(`PUT r2://${BUCKET}/${commerceKey} (from docs)`);
    uploadFile(commerceDoc, commerceKey);
  }

  const stripeDoc = path.join(REPO_ROOT, "docs/RUNTIME-CONTRACTS-STRIPE.md");
  const stripeKey = `${R2_PREFIX}/fnf-stripe-runtime/SKILL.md`;
  if (fs.existsSync(stripeDoc)) {
    console.log(`PUT r2://${BUCKET}/${stripeKey} (from docs)`);
    uploadFile(stripeDoc, stripeKey);
  }

  const existingRows = fetchExistingSkills();
  const existingBySlug = new Map(existingRows.map((r) => [r.slug, r]));

  const seedPath = path.join(REPO_ROOT, "db/seed-agentsam-skills.sql");
  const sql = buildSeedSql(skills, existingBySlug);

  if (!DRY_RUN) {
    fs.writeFileSync(seedPath, sql);
    console.log("Wrote", seedPath);
    sh(`./scripts/with-cf-admin-env.sh npx wrangler d1 execute fuelnfreetime --remote --file=db/migrate-agentsam-platform.sql`);
    sh(`./scripts/with-cf-admin-env.sh npx wrangler d1 execute fuelnfreetime --remote --file=db/migrate-agentsam-skill-revisions.sql`);
    sh(`./scripts/with-cf-admin-env.sh npx wrangler d1 execute fuelnfreetime --remote --file=db/seed-agentsam-platform.sql`);
    sh(`./scripts/with-cf-admin-env.sh npx wrangler d1 execute fuelnfreetime --remote --file=db/seed-agentsam-skills.sql`);
    sh(`./scripts/with-cf-admin-env.sh npx wrangler d1 execute fuelnfreetime --remote --file=db/patch-agentsam-skills-sync-invalidate.sql`);
    console.log("✓ Invalidated prompt registry caches (skills_sync)");
  }

  console.log(`✓ Synced ${skills.length} skill(s) → R2 ${R2_PREFIX}/ + D1 agentsam_skill`);
}

main();
