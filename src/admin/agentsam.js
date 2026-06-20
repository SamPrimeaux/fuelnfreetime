import { runAgentSamAi } from "../agentsam/ai-run.js";
import {
  bridgeConfigured,
  fetchGithubContextForChat,
  mcpConnectUrls,
  probeBridge,
  probeGitHubConnection,
} from "../agentsam/mcp-client.js";
import { listMcpServersForUi, mcpRuntimeConfig } from "../agentsam/mcp-servers.js";
import { listDrawerWorkflows, listStudioWorkflows, routeAgentsamRequest } from "../agentsam/router.js";
import { getAgentSamSkill, listAgentSamSkills } from "../agentsam/skills.js";
import { getSessionUser } from "../lib/auth.js";

const SYSTEM_PROMPT = `You are Agent Sam for Fuel & Free Time (fuelnfreetime.com).
You handle everything through one conversation: store ops, content writing, creative direction, brand work, email drafts, brainstorming, and repo/code guidance.
Be concise, practical, and on-brand — rugged, earned freedom, motorsports and garage culture.
Use LIVE STORE DATA, routed WORKFLOW/SKILLS, and GITHUB context when present.
Do not invent inventory, orders, or prices.
For image/logo/code tasks: produce clear deliverables, steps, or drafts; note when live publish or asset replacement needs owner approval.
GitHub access is scoped to SamPrimeaux/fuelnfreetime only.`;

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

  const user = await getSessionUser(request, env);
  const context = body?.context || {};
  const routing = await routeAgentsamRequest(env, message, context);

  const mcpContext = await fetchGithubContextForChat(env, message, user?.id || null);
  const connectUrls = mcpConnectUrls(env);

  const systemPrompt = [
    SYSTEM_PROMPT,
    context.page ? `Admin UI path: ${context.page}.` : "",
    context.slug ? `Editing CMS page slug: ${context.slug}.` : "",
    context.workflow_key ? `Selected workflow: ${context.workflow_key}.` : "",
    await liveStoreContext(env),
    mcpContext,
    connectUrls.fnf_github_oauth
      ? `GitHub OAuth (FNF-scoped): ${new URL(connectUrls.fnf_github_oauth, request.url).toString()}`
      : "",
    ...routing.system_blocks,
  ]
    .filter(Boolean)
    .join("\n\n");

  const ai = await runAgentSamAi(env, systemPrompt, message);

  if (ai.stub) {
    return json({
      ok: true,
      reply:
        "Agent Sam is ready but Workers AI (AGENTSAM_WAI) is not bound in this environment. Routing and workflows are live — bind AGENTSAM_WAI in wrangler.toml for AI responses.",
      stub: true,
      routing,
      mcp: { bridge: bridgeConfigured(env), github_context: !!mcpContext },
    });
  }

  if (!ai.ok) {
    console.error("agentsam chat ai failure", ai.error, ai.detail);
    return json(
      {
        error: "Agent Sam could not reach Workers AI. Try again in a moment.",
        detail: ai.error,
      },
      { status: 502 }
    );
  }

  return json({
    ok: true,
    reply: ai.reply,
    model: ai.model,
    routing,
    mcp: { bridge: bridgeConfigured(env), github_context: !!mcpContext },
  });
}

export async function agentsamStatus(env, userId = null) {
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

  const mcpServers = await listMcpServersForUi(env, userId);
  const bridgeProbe = bridgeConfigured(env) ? await probeBridge(env) : null;
  const github = await probeGitHubConnection(env, userId);

  return json({
    ok: true,
    bound: !!env.AGENTSAM_WAI,
    name: "Agent Sam",
    skills_registered: skillCount,
    workflows_registered: workflowCount,
    skills_storage: "D1 agentsam_skill + R2 agentsam/skills/",
    bridge_configured: bridgeConfigured(env),
    bridge_ready: bridgeProbe?.ok ?? false,
    github,
    mcp_servers: mcpServers,
    connect_urls: mcpConnectUrls(env),
  });
}

export async function agentsamMcpStatus(env, userId = null) {
  const bridge = bridgeConfigured(env);
  const probe = bridge ? await probeBridge(env) : null;
  const github = await probeGitHubConnection(env, userId);

  return json({
    ok: true,
    ...mcpRuntimeConfig(env),
    bridge_ready: probe?.ok ?? false,
    tool_count: probe?.tool_count ?? 0,
    github,
    connect_urls: mcpConnectUrls(env),
    mcp_servers: await listMcpServersForUi(env, userId),
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
      { label: "Repo work", prompt: "Summarize recent commits on fuelnfreetime and what to verify before deploy" },
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
