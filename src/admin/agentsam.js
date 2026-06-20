import { M } from "../cms/media-paths.js";
import {
  formatSkillsForPrompt,
  getAgentSamSkill,
  listAgentSamSkills,
  resolveSkillsForChat,
} from "../agentsam/skills.js";

const AGENTSAM_MODEL = "@cf/meta/llama-3.1-8b-instruct";

const SYSTEM_PROMPT = `You are Agent Sam, the Fuel & Free Time admin assistant.
You help the store owner manage products, content, pages, orders, and the storefront at fuelnfreetime.com.
Be concise, practical, and on-brand (rugged, earned freedom, motorsports/garage culture).
Use the LIVE STORE DATA block when answering inventory, product, or page questions.
Do not invent order numbers or inventory counts.`;

function json(data, init = {}) {
  return Response.json(data, init);
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function extractReply(result) {
  if (!result) return "";
  if (typeof result.response === "string") return result.response;
  if (typeof result.content === "string") return result.content;
  if (Array.isArray(result.messages)) {
    const last = result.messages[result.messages.length - 1];
    if (last?.content) return String(last.content);
  }
  return JSON.stringify(result);
}

async function liveStoreContext(env) {
  try {
    const [products, pages, lowStock] = await Promise.all([
      env.DB.prepare(
        `SELECT COUNT(*) AS n FROM products WHERE status = 'active'`
      ).first(),
      env.DB.prepare(
        `SELECT slug, title, status, updated_at FROM pages ORDER BY updated_at DESC LIMIT 12`
      ).all(),
      env.DB.prepare(
        `SELECT p.title, v.size, v.inventory_qty, v.sku
         FROM product_variants v
         JOIN products p ON p.id = v.product_id
         WHERE p.status = 'active' AND v.inventory_qty <= 5
         ORDER BY v.inventory_qty ASC LIMIT 8`
      ).all(),
    ]);

    const pageLines = (pages.results || [])
      .map((p) => `- ${p.slug}: ${p.status} (updated ${p.updated_at || "—"})`)
      .join("\n");

    const stockLines = (lowStock.results || [])
      .map((r) => `- ${r.title} ${r.size || r.sku}: ${r.inventory_qty} left`)
      .join("\n");

    return `LIVE STORE DATA:
Active products: ${products?.n ?? 0}
Pages:
${pageLines || "(none seeded — run CMS bootstrap in admin)"}
Low stock (≤5):
${stockLines || "(none)"}`;
  } catch {
    return "LIVE STORE DATA: unavailable (D1 not bound).";
  }
}

export async function agentsamChat(request, env) {
  const body = await readJson(request);
  const message = (body?.message || "").trim();
  if (!message) return json({ error: "message required" }, { status: 400 });

  const context = body?.context || {};
  const matchedSkills = await resolveSkillsForChat(env, message, context);
  const skillsBlock = formatSkillsForPrompt(matchedSkills);

  const contextLines = [
    context.page ? `Admin UI path: ${context.page}.` : "",
    context.slug ? `Editing CMS page slug: ${context.slug}.` : "",
    await liveStoreContext(env),
    skillsBlock,
  ]
    .filter(Boolean)
    .join("\n\n");

  if (!env.AGENTSAM_WAI) {
    return json({
      ok: true,
      reply:
        "Agent Sam is ready but Workers AI (AGENTSAM_WAI) is not bound in this environment. Bind AGENTSAM_WAI in wrangler.toml to enable live responses.",
      stub: true,
    });
  }

  try {
    const result = await env.AGENTSAM_WAI.run(AGENTSAM_MODEL, {
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "system", content: contextLines },
        { role: "user", content: message.slice(0, 4000) },
      ],
    });

    const reply = extractReply(result).trim() || "I couldn't generate a response. Try again.";
    return json({
      ok: true,
      reply,
      model: AGENTSAM_MODEL,
      skills: matchedSkills.map((s) => ({ slug: s.slug, name: s.name })),
    });
  } catch (err) {
    console.error("agentsam chat error", err);
    return json(
      {
        error: "Agent Sam could not reach Workers AI. Try again in a moment.",
        detail: err?.message || String(err),
      },
      { status: 502 }
    );
  }
}

export async function agentsamStatus(env) {
  let skillCount = 0;
  try {
    const { results } = await env.DB.prepare(
      `SELECT COUNT(*) AS n FROM agentsam_skill WHERE is_active = 1`
    ).all();
    skillCount = results?.[0]?.n ?? 0;
  } catch {
    /* table may not exist yet */
  }

  return json({
    ok: true,
    bound: !!env.AGENTSAM_WAI,
    model: AGENTSAM_MODEL,
    name: "Agent Sam",
    skills_registered: skillCount,
    skills_storage: "D1 agentsam_skill + R2 agentsam/skills/",
  });
}

export async function agentsamSkillsList(env, url) {
  const hydrate = url.searchParams.get("hydrate") === "1";
  const skills = await listAgentSamSkills(env, { hydrate });
  return json({ ok: true, skills });
}

export async function agentsamSkillGet(env, slug, url) {
  const includeReferences = url.searchParams.get("references") !== "0";
  const skill = await getAgentSamSkill(env, slug, { includeReferences });
  if (!skill) return json({ error: "Skill not found" }, { status: 404 });
  return json({ ok: true, skill });
}
