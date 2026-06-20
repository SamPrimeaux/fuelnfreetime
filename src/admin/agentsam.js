import { runAgentSamAi } from "../agentsam/ai-run.js";
import {
  createAnalyticsIds,
  getAgentSamAnalyticsStatus,
  summarizeAgentSamAnalytics,
  trackAgentSamEvent,
} from "../agentsam/analytics.js";
import { getAIRegistryStatus, listAIModelsGrouped } from "../agentsam/ai-registry.js";
import { getToolsRegistryStatus, listToolsGrouped } from "../agentsam/tools-registry.js";
import {
  bridgeConfigured,
  fetchGithubContextForChat,
  mcpConnectUrls,
  probeBridge,
  probeGitHubConnection,
} from "../agentsam/mcp-client.js";
import { FNF_GITHUB_REPO } from "../agentsam/constants.js";
import { listMcpServersForUi, mcpRuntimeConfig } from "../agentsam/mcp-servers.js";
import { listDrawerWorkflows, listStudioWorkflows, routeAgentsamRequest } from "../agentsam/router.js";
import { getAgentSamSkill, listAgentSamSkills } from "../agentsam/skills.js";
import { getSessionUser } from "../lib/auth.js";

const SYSTEM_PROMPT = `You are Agent Sam for Fuel & Free Time (fuelnfreetime.com).
You handle everything through one conversation: store ops, content writing, creative direction, brand work, email drafts, brainstorming, and repo/code guidance.
Be concise, practical, and on-brand — rugged, earned freedom, motorsports and garage culture.
Use LIVE STORE DATA, routed WORKFLOW/SKILLS, and GITHUB context when present.
For Cloudflare/Workers/D1/R2/deploy/MCP tasks: follow loaded Cloudflare skills and fnf-cloudflare-runtime (bindings, secrets, deploy paths).
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

export async function agentsamChat(request, env, executionCtx = null) {
  const chatStarted = Date.now();
  const body = await readJson(request);
  const message = (body?.message || "").trim();
  if (!message) return json({ error: "message required" }, { status: 400 });

  const user = await getSessionUser(request, env);
  const context = body?.context || {};
  const ids = createAnalyticsIds(body, context);
  const trackBase = {
    ctx: executionCtx,
    ...ids,
    admin_user_id: user?.id || null,
    user_id: user?.id || null,
    user_email: user?.email || null,
  };

  await trackAgentSamEvent(
    env,
    {
      event_type: "chat",
      event_name: "chat_request_started",
      status: "started",
      prompt_text: message,
      input_chars: message.length,
    },
    trackBase
  );

  const routingStarted = Date.now();
  const routing = await routeAgentsamRequest(env, message, context);
  const routingLatencyMs = Date.now() - routingStarted;
  const workflowKey = routing.classification.workflow_key;
  const aiRouting = routing.ai_routing || {};

  await trackAgentSamEvent(
    env,
    {
      event_type: "routing",
      event_name: "route_selected",
      status: "success",
      intent: routing.classification.intent,
      workflow_key: workflowKey,
      workflow_id: routing.workflow?.id || null,
      route_lane: aiRouting.lane || aiRouting.model_lane,
      task_type: aiRouting.task_type,
      routing_latency_ms: routingLatencyMs,
      metadata: {
        source: routing.classification.source,
        skills: routing.skills?.map((s) => s.slug) || [],
      },
    },
    trackBase
  );

  if (routing.workflow) {
    await trackAgentSamEvent(
      env,
      {
        event_type: "workflow",
        event_name: "workflow_selected",
        status: "success",
        workflow_id: routing.workflow.id,
        workflow_key: routing.workflow.key,
        intent: routing.classification.intent,
        task_type: aiRouting.task_type,
        metadata: {
          requires_approval: routing.workflow.requires_approval,
          risk: routing.workflow.risk,
        },
      },
      trackBase
    );

    if (routing.workflow.requires_approval) {
      await trackAgentSamEvent(
        env,
        {
          event_type: "approval",
          event_name: "approval_required",
          status: "approval_required",
          workflow_key: routing.workflow.key,
          workflow_id: routing.workflow.id,
          entity_type: "workflow",
          entity_id: routing.workflow.id,
          entity_label: routing.workflow.name,
          metadata: { intent: routing.classification.intent },
        },
        trackBase
      );
    }
  }

  const githubStarted = Date.now();
  const githubResult = await fetchGithubContextForChat(env, message, user?.id || null);
  const mcpContext = githubResult.context;
  const githubMeta = githubResult.meta;

  if (githubMeta) {
    await trackAgentSamEvent(
      env,
      {
        event_type: githubMeta.mcp_tool ? "mcp" : "github",
        event_name: githubMeta.mcp_tool ? "mcp_tool_called" : "github_context_loaded",
        status: githubMeta.success ? "success" : "failed",
        github_repo: githubMeta.github_repo || FNF_GITHUB_REPO,
        github_operation: githubMeta.github_operation,
        mcp_server: githubMeta.mcp_server,
        mcp_tool: githubMeta.mcp_tool,
        mcp_success: githubMeta.mcp_success,
        mcp_latency_ms: githubMeta.mcp_latency_ms ?? Date.now() - githubStarted,
        error_code: githubMeta.error || null,
      },
      trackBase
    );
  }

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

  if (aiRouting.task_type === "image_generation") {
    await trackAgentSamEvent(
      env,
      {
        event_type: "image",
        event_name: "image_generation_requested",
        status: "started",
        workflow_key: workflowKey,
        task_type: aiRouting.task_type,
        entity_type: "workflow",
        entity_id: routing.workflow?.id || workflowKey,
        entity_label: routing.workflow?.name || workflowKey,
        prompt_text: message,
      },
      trackBase
    );
  }

  const ai = await runAgentSamAi(env, systemPrompt, message, {
    ...aiRouting,
    workflow_key: workflowKey,
    intent: routing.classification.intent,
    analytics: {
      execution_ctx: executionCtx,
      ...ids,
      workflow_key: workflowKey,
      workflow_id: routing.workflow?.id || null,
      user_id: user?.id || null,
      admin_user_id: user?.id || null,
      user_email: user?.email || null,
      intent: routing.classification.intent,
    },
  });

  const totalLatencyMs = Date.now() - chatStarted;

  if (ai.stub) {
    return json({
      ok: true,
      reply:
        "Agent Sam is ready but Workers AI (AGENTSAM_WAI) is not bound in this environment. Routing and workflows are live — bind AGENTSAM_WAI in wrangler.toml for AI responses.",
      stub: true,
      routing,
      mcp: { bridge: bridgeConfigured(env), github_context: !!mcpContext },
      analytics: { session_id: ids.session_id, message_id: ids.message_id, tracked: true },
    });
  }

  if (!ai.ok) {
    await trackAgentSamEvent(
      env,
      {
        event_type: "error",
        event_name: "agentsam_error",
        status: "failed",
        error_code: ai.error || "ai_failed",
        error_message: ai.error,
        error_stage: "chat_response",
        workflow_key: workflowKey,
        model_id: ai.selected_model,
        task_type: ai.task_type,
        total_latency_ms: totalLatencyMs,
        ai_latency_ms: ai.ai_latency_ms,
        attempted_models: ai.attempted_models,
        prompt_text: message,
      },
      trackBase
    );

    console.error("agentsam chat ai failure", ai.error);
    return json(
      {
        error: "Agent Sam could not reach Workers AI. Try again in a moment.",
        detail: ai.error,
        analytics: { session_id: ids.session_id, message_id: ids.message_id, tracked: true },
      },
      { status: 502 }
    );
  }

  await trackAgentSamEvent(
    env,
    {
      event_type: "chat",
      event_name: "chat_response_completed",
      status: "success",
      intent: routing.classification.intent,
      workflow_key: workflowKey,
      task_type: ai.task_type,
      model_id: ai.selected_model,
      model_lane: ai.model_lane,
      fallback_used: ai.fallback_used,
      attempted_models: ai.attempted_models,
      prompt_text: message,
      response_text: ai.reply,
      input_chars: message.length,
      output_chars: ai.reply?.length || 0,
      input_tokens: ai.input_tokens,
      output_tokens: ai.output_tokens,
      total_tokens: ai.total_tokens,
      estimated_cost_usd: ai.estimated_cost_usd,
      duration_ms: totalLatencyMs,
      ai_latency_ms: ai.ai_latency_ms,
      total_latency_ms: totalLatencyMs,
      metadata: {
        image_generated: Boolean(ai.image_base64),
        registry: ai.registry,
      },
    },
    trackBase
  );

  return json({
    ok: true,
    reply: ai.reply,
    model: ai.model,
    ai: {
      selected_model: ai.selected_model,
      attempted_models: ai.attempted_models,
      model_lane: ai.model_lane,
      task_type: ai.task_type,
      auxiliary_task_type: ai.auxiliary_task_type || null,
      fallback_used: ai.fallback_used,
      registry: ai.registry ?? true,
      image_base64: ai.image_base64 || null,
      mime_type: ai.mime_type || null,
      input_tokens: ai.input_tokens,
      output_tokens: ai.output_tokens,
      estimated_cost_usd: ai.estimated_cost_usd,
      ai_latency_ms: ai.ai_latency_ms,
    },
    routing,
    mcp: { bridge: bridgeConfigured(env), github_context: !!mcpContext },
    analytics: {
      session_id: ids.session_id,
      message_id: ids.message_id,
      tracked: true,
    },
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
  const aiRegistry = await getAIRegistryStatus(env);
  const analyticsStatus = await getAgentSamAnalyticsStatus(env);
  const toolsRegistry = await getToolsRegistryStatus(env);

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
    ...aiRegistry,
    analytics: analyticsStatus,
    tools: toolsRegistry,
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
  const [workflows, drawerWorkflows, mcpServers, toolCatalog] = await Promise.all([
    listStudioWorkflows(env),
    listDrawerWorkflows(env),
    listMcpServersForUi(env),
    listToolsGrouped(env),
  ]);

  return json({
    ok: true,
    workflows,
    drawer_workflows: drawerWorkflows,
    mcp_servers: mcpServers,
    tool_catalog: toolCatalog,
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

export async function agentsamAiModelsList(env) {
  const { grouped, total } = await listAIModelsGrouped(env);
  return json({ ok: true, grouped, total });
}

export async function agentsamToolsCatalog(env) {
  const { grouped, total } = await listToolsGrouped(env);
  return json({ ok: true, grouped, total });
}

export async function agentsamAnalyticsSummary(env, url) {
  const range = url.searchParams.get("range") || "24h";
  const summary = await summarizeAgentSamAnalytics(env, { range });
  return json(summary);
}
