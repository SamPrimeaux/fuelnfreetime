import { hydrateSkillRowFromR2, hydrateSkillWithFiles, hydrateSkillsFromR2 } from "./skill-r2.js";
import { FNF_TENANT_ID } from "./constants.js";

function parseJsonArray(raw, fallback = []) {
  try {
    if (!raw) return fallback;
    const v = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

function parseMetadata(row) {
  try {
    const raw = row?.metadata_json;
    if (!raw) return {};
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return {};
  }
}

function skillDomain(row) {
  const meta = parseMetadata(row);
  return meta.skill_domain || meta.domain || "";
}

export async function listAgentSamSkills(env, { hydrate = false } = {}) {
  const { results } = await env.DB.prepare(
    `SELECT id, slug, name, description, file_path, scope, slash_trigger,
            globs, tags_json, task_types_json, route_keys_json, metadata_json,
            retrieval_strategy, sort_order, version, is_active, updated_at,
            tenant_id, workspace_id, access_mode, always_apply
     FROM agentsam_skill
     WHERE is_active = 1 AND tenant_id = ?
     ORDER BY sort_order ASC, name ASC`
  )
    .bind(FNF_TENANT_ID)
    .all();

  if (!hydrate) return results || [];
  return hydrateSkillsFromR2(env, results || []);
}

export async function getAgentSamSkill(env, slug, { includeReferences = false } = {}) {
  const row = await env.DB.prepare(
    `SELECT * FROM agentsam_skill WHERE slug = ? AND tenant_id = ? AND is_active = 1 LIMIT 1`
  )
    .bind(slug, FNF_TENANT_ID)
    .first();

  if (!row) return null;

  if (!includeReferences) {
    return hydrateSkillRowFromR2(env, row);
  }

  const { results: files } = await env.DB.prepare(
    `SELECT file_path, role, sort_order FROM agentsam_skill_file
     WHERE skill_id = ? ORDER BY sort_order ASC, file_path ASC`
  )
    .bind(row.id)
    .all();

  return hydrateSkillWithFiles(env, row, files || []);
}

/**
 * Pick skills relevant to admin chat message + UI context.
 */
export async function resolveSkillsForChat(env, message, context = {}) {
  const { results: rows } = await env.DB.prepare(
    `SELECT * FROM agentsam_skill WHERE is_active = 1 AND tenant_id = ? ORDER BY sort_order ASC`
  )
    .bind(FNF_TENANT_ID)
    .all();

  if (!rows?.length) return [];

  const haystack = [
    message,
    context.page || "",
    context.slug || "",
    context.topic || "",
  ]
    .join(" ")
    .toLowerCase();

  const scored = [];

  for (const row of rows) {
    let score = 0;
    const tags = parseJsonArray(row.tags_json);
    const tasks = parseJsonArray(row.task_types_json);
    const domain = skillDomain(row).toLowerCase();
    const slug = String(row.slug || "").toLowerCase();

    for (const tag of tags) {
      if (haystack.includes(String(tag).toLowerCase())) score += 3;
    }
    for (const task of tasks) {
      if (haystack.includes(String(task).toLowerCase())) score += 2;
    }
    if (slug && haystack.includes(slug.replace(/-/g, " "))) score += 2;
    if (slug && haystack.includes(slug)) score += 3;

    if (domain === "commerce" && /product|inventory|order|shop|cart/.test(haystack)) score += 4;
    if (domain === "stripe" && /stripe|payment|checkout|webhook/.test(haystack)) score += 5;

    if (row.always_apply) score += 8;

    if (row.slash_trigger && haystack.includes(String(row.slash_trigger).toLowerCase())) {
      score += 6;
    }

    if (score > 0) scored.push({ row, score });
  }

  scored.sort((a, b) => b.score - a.score || a.row.sort_order - b.row.sort_order);

  const top = scored.slice(0, 2).map((s) => s.row);
  if (top.length) {
    return Promise.all(
      top.map(async (row) => {
        const { results: files } = await env.DB.prepare(
          `SELECT file_path, role, sort_order FROM agentsam_skill_file
           WHERE skill_id = ? AND role = 'reference'
           ORDER BY sort_order ASC LIMIT 4`
        )
          .bind(row.id)
          .all();
        return hydrateSkillWithFiles(env, row, files || []);
      })
    );
  }

  if (/(product|inventory|order|shop|checkout|stripe|payment)/i.test(haystack)) {
    const slugs = ["fnf-commerce-runtime", "stripe-best-practices"];
    const picked = rows.filter((r) => slugs.includes(r.slug)).slice(0, 2);
    return Promise.all(picked.map((row) => hydrateSkillRowFromR2(env, row)));
  }

  return [];
}

export function formatSkillsForPrompt(skills) {
  if (!skills?.length) return "";

  const blocks = skills
    .filter((s) => s.content_markdown?.trim())
    .map((s) => {
      let block = `## Skill: ${s.name} (${s.slug})\n\n${s.content_markdown.trim()}`;
      if (s.reference_markdown?.trim()) {
        block += `\n\n### References\n\n${s.reference_markdown.trim()}`;
      }
      return block;
    });

  if (!blocks.length) return "";
  return `AGENT SKILLS (follow when relevant):\n\n${blocks.join("\n\n---\n\n")}`;
}
