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
  return "platform";
}

function inferTags(slug, domain) {
  const tags = [slug.replace(/-/g, "_")];
  if (domain === "stripe") tags.push("stripe", "payments", "checkout", "webhooks");
  if (domain === "commerce") tags.push("commerce", "products", "inventory", "orders");
  return [...new Set(tags)];
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

function sqlEscape(s) {
  return String(s ?? "").replace(/'/g, "''");
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
  metadata,
  sortOrder,
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
  0,
  '${sqlEscape(JSON.stringify(taskTypes || []))}',
  '[]',
  '{}',
  'read_only',
  '${sqlEscape(JSON.stringify(tags || []))}',
  '${sqlEscape(JSON.stringify(metadata || {}))}',
  'r2',
  ${sortOrder},
  1,
  1,
  datetime('now')
);`;
}

function buildSeedSql(skills) {
  const lines = ["-- Generated by scripts/sync-agentsam-skills.mjs", ""];

  for (const skill of skills) {
    const metadata = {
      r2_bucket: BUCKET,
      r2_skill_key: skill.mainR2Key,
      source: ".cursor/skills",
      skill_domain: skill.domain,
    };

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
        globs: [],
        taskTypes:
          skill.domain === "stripe"
            ? ["stripe", "payments", "commerce"]
            : skill.domain === "commerce"
              ? ["commerce", "products"]
              : ["platform"],
        metadata,
        sortOrder: skill.domain === "stripe" ? 10 : 20,
      })
    );
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
      metadata: {
        r2_bucket: BUCKET,
        r2_skill_key: `${R2_PREFIX}/fnf-commerce-runtime/SKILL.md`,
        source: "docs",
        skill_domain: "commerce",
      },
      sortOrder: 5,
    })
  );

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

  const seedPath = path.join(REPO_ROOT, "db/seed-agentsam-skills.sql");
  let sql = buildSeedSql(skills);

  if (fs.existsSync(stripeDoc)) {
    sql += `\n\n${skillInsertSql({
      id: "skill_fnf_stripe_runtime",
      slug: "fnf-stripe-runtime",
      name: "FNF Stripe implementation checklist",
      description: "Ordered Stripe Checkout tasks and inventory rules for Fuel & Free Time.",
      filePath: stripeKey,
      domain: "stripe",
      slashTrigger: "stripe",
      tags: ["stripe", "checkout", "webhooks", "payments"],
      globs: ["docs/RUNTIME-CONTRACTS-STRIPE.md", ".cursor/skills/stripe-best-practices/**"],
      taskTypes: ["stripe", "payments", "commerce"],
      metadata: {
        r2_bucket: BUCKET,
        r2_skill_key: stripeKey,
        source: "docs",
        skill_domain: "stripe",
      },
      sortOrder: 6,
    })}\n`;
  }

  if (!DRY_RUN) {
    fs.writeFileSync(seedPath, sql);
    console.log("Wrote", seedPath);
    sh(`./scripts/with-cf-admin-env.sh npx wrangler d1 execute fuelnfreetime --remote --file=db/migrate-agentsam-platform.sql`);
    sh(`./scripts/with-cf-admin-env.sh npx wrangler d1 execute fuelnfreetime --remote --file=db/seed-agentsam-platform.sql`);
    sh(`./scripts/with-cf-admin-env.sh npx wrangler d1 execute fuelnfreetime --remote --file=db/seed-agentsam-skills.sql`);
  }

  console.log(`✓ Synced ${skills.length} skill(s) → R2 ${R2_PREFIX}/ + D1 agentsam_skill`);
}

main();
