/**
 * D1-backed quick actions and + menu capabilities for AgentSam UI.
 */

import { FNF_WORKSPACE_ID } from "./constants.js";
import { listAgentSamTools } from "./tools-registry.js";
import { listStudioWorkflows } from "./router.js";

const IAM_LOGO =
  "https://imagedelivery.net/g7wf09fCONpnidkRnR_5vw/ac515729-af6b-4ea5-8b10-e581a4d02100/thumbnail";

const DEFAULT_ACTIONS = [
  {
    id: "write_edit",
    label: "Write or edit",
    workflow_key: "fnf_content_studio",
    task_type: "text_generation",
    lane: "general",
    prompt: "Draft product copy for our latest tee — rugged, earned freedom tone.",
    enabled: true,
  },
  {
    id: "repo_work",
    label: "Repo work",
    workflow_key: "fnf_content_studio",
    task_type: "code_generation",
    lane: "code",
    prompt: "Summarize recent commits on fuelnfreetime and what to verify before deploy.",
    enabled: true,
  },
];

function parseJson(raw, fallback = null) {
  try {
    if (raw == null || raw === "") return fallback;
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return fallback;
  }
}

async function hasActiveImageModels(env) {
  try {
    const row = await env.DB.prepare(
      `SELECT COUNT(*) AS n FROM agentsam_ai
       WHERE workspace_id = ? AND status = 'active' AND task_type = 'image_generation'`
    )
      .bind(FNF_WORKSPACE_ID)
      .first();
    return (row?.n ?? 0) > 0;
  } catch {
    return false;
  }
}

async function hasExecutableWebTool(env) {
  const tools = await listAgentSamTools(env);
  return tools.some(
    (t) =>
      t.is_active &&
      /web|search/i.test(`${t.tool_key} ${t.display_name}`) &&
      t.handler_type === "mcp" &&
      !/cloudflare.docs|documentation/i.test(t.display_name || "")
  );
}

export async function buildQuickActions(env) {
  const [workflows, imageReady] = await Promise.all([
    listStudioWorkflows(env),
    hasActiveImageModels(env),
  ]);

  const actions = [];

  if (imageReady) {
    const creative = workflows.find((w) => w.workflow_key === "fnf_creative_studio");
    actions.push({
      id: "create_image",
      label: "Create an image",
      workflow_key: "fnf_creative_studio",
      task_type: "image_generation",
      lane: "image",
      prompt: creative?.suggested_prompts?.[0] || "Describe the image you want for Fuel n Freetime.",
      mode: "image",
      enabled: true,
    });
  }

  const content = workflows.find((w) => w.workflow_key === "fnf_content_studio");
  if (content) {
    actions.push({
      id: "write_edit",
      label: "Write or edit",
      workflow_key: "fnf_content_studio",
      task_type: "text_generation",
      lane: "general",
      prompt: content.suggested_prompts?.[0] || "Write better product copy for this item.",
      enabled: true,
    });
  }

  const hasWeb = await hasExecutableWebTool(env);
  if (hasWeb) {
    actions.push({
      id: "lookup",
      label: "Look something up",
      workflow_key: "fnf_content_studio",
      task_type: "text_generation",
      lane: "general",
      prompt: "What should we publish next on fuelnfreetime.com?",
      enabled: true,
    });
  } else if (content?.suggested_prompts?.length > 2) {
    actions.push({
      id: "plan_content",
      label: "Plan content",
      workflow_key: "fnf_content_studio",
      task_type: "text_generation",
      lane: "general",
      prompt: content.suggested_prompts[2] || "What should we publish next on the site?",
      enabled: true,
    });
  }

  actions.push({
    id: "repo_work",
    label: "Repo work",
    workflow_key: "fnf_content_studio",
    task_type: "code_generation",
    lane: "code",
    prompt: "Summarize recent commits on fuelnfreetime and what to verify before deploy.",
    enabled: true,
  });

  return actions.slice(0, 4);
}

export function buildPlusMenuCapabilities({ imageReady, webReady, researchReady }) {
  return {
    attach: { enabled: true, label: "Add photos & files" },
    image: {
      enabled: imageReady,
      label: imageReady ? "Create image" : "Create image (AI unavailable)",
      mode: "image",
      workflow_key: "fnf_creative_studio",
    },
    research: {
      enabled: researchReady,
      label: researchReady ? "Plan research" : "Plan research (coming soon)",
      disabled_reason: researchReady ? null : "No research tool registered yet.",
    },
    web: {
      enabled: webReady,
      label: webReady ? "Web search" : "Web search (coming soon)",
      disabled_reason: webReady ? null : "No web search tool is executable yet.",
    },
  };
}

export async function buildAgentsamUiConfig(env) {
  const [quick_actions, imageReady, webReady] = await Promise.all([
    buildQuickActions(env),
    hasActiveImageModels(env),
    hasExecutableWebTool(env),
  ]);

  const plus_menu = buildPlusMenuCapabilities({
    imageReady,
    webReady,
    researchReady: false,
  });

  return {
    quick_actions: quick_actions.length ? quick_actions : DEFAULT_ACTIONS,
    plus_menu,
    iam_logo_url: IAM_LOGO,
  };
}

export { IAM_LOGO };
