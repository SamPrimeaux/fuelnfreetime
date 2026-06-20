import {
  bridgeConfigured,
  fetchGithubContextForChat,
  mcpConnectUrls,
  probeBridge,
  probeGitHubViaBridge,
} from "../agentsam/mcp-client.js";
import { listMcpServersForUi, mcpRuntimeConfig } from "../agentsam/mcp-servers.js";
import { listDrawerWorkflows, listStudioWorkflows, routeAgentsamRequest } from "../agentsam/router.js";
import { getAgentSamSkill, listAgentSamSkills } from "../agentsam/skills.js";

const AGENTSAM_MODEL = "@cf/meta/llama-3.1-8b-instruct";

const SYSTEM_PROMPT = `You are Agent Sam for Fuel & Free Time (fuelnfreetime.com).
You handle everything through one conversation: store ops, content writing, creative direction, brand work, email drafts, brainstorming, and repo/code guidance.
Be concise, practical, and on-brand — rugged, earned freedom, motorsports and garage culture.
Use LIVE STORE DATA, routed WORKFLOW/SKILLS, and MCP/GITHUB context when present.
Do not invent inventory, orders, or prices.
For image/logo/code tasks: produce clear deliverables, steps, or drafts; note when live publish or asset replacement needs owner approval.
When GitHub MCP context says not connected, tell the user to connect GitHub in IAM integrations (link provided in routing).`;

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
      env.DB.prepare(`SELECT COUNT(*) AS n FROM products WHERE status = 'active'`).first(),
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
  const routing = await routeAgentsamRequest(env, message, context);

  const mcpContext = bridgeConfigured(env) ? await fetchGithubContextForChat(env, message) : null;
  const connectUrls = mcpConnectUrls(env);

  const contextLines = [
    context.page ? `Admin UI path: ${context.page}.` : "",
    context.slug ? `Editing CMS page slug: ${context.slug}.` : "",
    context.workflow_key ? `Selected workflow: ${context.workflow_key}.` : "",
    await liveStoreContext(env),
    mcpContext,
    connectUrls.iam_integrations
      ? `IAM integrations (GitHub OAuth): ${connectUrls.iam_integrations}`
      : "",
    ...routing.system_blocks,
  ]
    .filter(Boolean)
    .join("\n\n");

  if (!env.AGENTSAM_WAI) {
    return json({
      ok: true,
      reply:
        "Agent Sam is ready but Workers AI (AGENTSAM_WAI) is not bound in this environment. Routing and workflows are live — bind AGENTSAM_WAI in wrangler.toml for AI responses.",
      stub: true,
      routing,
      mcp: { bridge: bridgeConfigured(env), github_context: !!mcpContext },
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
      routing,
      mcp: { bridge: bridgeConfigured(env), github_context: !!mcpContext },
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
  let workflowCount = 0;
  try {
    const skills = await env.DB.prepare(
      `SELECT COUNT(*) AS n FROM agentsam_skill WHERE is_active = 1`
    ).first();
    skillCount = skills?.n ?? 0;
    const wfs = await env.DB.prepare(
      `SELECT COUNT(*) AS n FROM agentsam_workflows WHERE is_active = 1`
    ).first();
    workflowCount = wfs?.n ?? 0;
  } catch {
    /* tables may not exist yet */
  }

  const mcpServers = await listMcpServersForUi(env);
  const bridgeProbe = bridgeConfigured(env) ? await probeBridge(env) : null;

  return json({
    ok: true,
    bound: !!env.AGENTSAM_WAI,
    model: AGENTSAM_MODEL,
    name: "Agent Sam",
    skills_registered: skillCount,
    workflows_registered: workflowCount,
    skills_storage: "D1 agentsam_skill + R2 agentsam/skills/",
    bridge_configured: bridgeConfigured(env),
    bridge_ready: bridgeProbe?.ok ?? false,
    mcp_servers: mcpServers,
    connect_urls: mcpConnectUrls(env),
  });
}

export async function agentsamMcpStatus(env) {
  const bridge = bridgeConfigured(env);
  const probe = bridge ? await probeBridge(env) : null;
  const github = bridge && probe?.ok ? await probeGitHubViaBridge(env) : null;

  return json({
    ok: true,
    ...mcpRuntimeConfig(env),
    bridge_ready: probe?.ok ?? false,
    tool_count: probe?.tool_count ?? 0,
    github: github || { connected: false },
    connect_urls: mcpConnectUrls(env),
    mcp_servers: await listMcpServersForUi(env),
  });
}

export async function agentsamTools(env) {
  const [workflows, drawerWorkflows, mcpServers] = await Promise.all([
    listStudioWorkflows(env),
    listDrawerWorkflows(env),
    listMcpServersForUi(env),
  ]);

  return json({
    ok: true,
    workflows,
    drawer_workflows: drawerWorkflows,
    mcp_servers: mcpServers,
    connect_urls: mcpConnectUrls(env),
    quick_actions: [
      { label: "Create an image", prompt: "Generate a premium collection banner direction for Fuel n Freetime" },
      { label: "Write or edit", prompt: "Draft product copy for our latest tee — rugged, earned freedom tone" },
      { label: "Look something up", prompt: "What should we publish next on fuelnfreetime.com?" },
      { label: "Repo work", prompt: "Summarize what changed in the fuelnfreetime repo and what to verify before deploy" },
    ],
  });
}

export async function agentsamWorkflowsList(env) {
  const workflows = await listStudioWorkflows(env);
  return json({ ok: true, workflows });
}

export async function agentsamDrawerWorkflowsList(env) {
  const workflows = await listDrawerWorkflows(env);
  return json({ ok: true, workflows });
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
