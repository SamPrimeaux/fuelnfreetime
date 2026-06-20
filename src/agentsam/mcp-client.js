/**
 * Inner Animal MCP client — service dispatch via AGENTSAM_BRIDGE_KEY.
 */

import { FNF_GITHUB_REPO, FNF_TENANT_ID, FNF_WORKSPACE_ID } from "./constants.js";

const DEFAULT_MCP_URL = "https://mcp.inneranimalmedia.com/mcp";
const DEFAULT_IAM_ORIGIN = "https://inneranimalmedia.com";

export function mcpUrl(env) {
  return String(env.IAM_MCP_URL || DEFAULT_MCP_URL).trim();
}

export function iamOrigin(env) {
  return String(env.IAM_ORIGIN || DEFAULT_IAM_ORIGIN).replace(/\/$/, "");
}

export function bridgeConfigured(env) {
  return Boolean(String(env.AGENTSAM_BRIDGE_KEY || "").trim());
}

function bridgeKey(env) {
  return String(env.AGENTSAM_BRIDGE_KEY || "").trim();
}

function bridgeHeaders(env, extra = {}) {
  return {
    Authorization: `Bearer ${bridgeKey(env)}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Tenant-Id": FNF_TENANT_ID,
    "X-Workspace-Id": FNF_WORKSPACE_ID,
    ...extra,
  };
}

function parseToolText(result) {
  const text = result?.result?.content?.[0]?.text;
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export async function mcpRpc(env, method, params = {}) {
  const key = bridgeKey(env);
  if (!key) return { ok: false, error: "bridge_not_configured" };

  try {
    const res = await fetch(mcpUrl(env), {
      method: "POST",
      headers: bridgeHeaders(env),
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: crypto.randomUUID(),
        method,
        params,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data?.error?.message || `mcp_http_${res.status}`, data };
    }
    if (data?.error) {
      return { ok: false, error: data.error.message || "mcp_rpc_error", data };
    }
    return { ok: true, result: data.result, data };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
}

export async function probeBridge(env) {
  if (!bridgeConfigured(env)) {
    return { ok: false, configured: false, error: "bridge_not_configured" };
  }

  const init = await mcpRpc(env, "initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "fuelnfreetime-agentsam", version: "1.0.0" },
  });
  if (!init.ok) return { ok: false, configured: true, error: init.error };

  const tools = await mcpRpc(env, "tools/list", {});
  const toolCount = tools.ok ? (tools.result?.tools?.length ?? 0) : 0;

  return {
    ok: tools.ok,
    configured: true,
    tool_count: toolCount,
    error: tools.ok ? null : tools.error,
  };
}

export async function callMcpTool(env, toolName, args = {}) {
  return mcpRpc(env, "tools/call", { name: toolName, arguments: args });
}

export async function probeGitHubViaBridge(env) {
  const listed = await callMcpTool(env, "agentsam_github_repo_list", {});
  const body = parseToolText(listed);
  if (!listed.ok) return { connected: false, error: listed.error };
  if (body?.ok === false && body?.error === "github_not_connected") {
    return { connected: false, needs_oauth: true, error: body.error };
  }
  const repos = body?.repos || body?.data?.repos;
  const hasFnf = Array.isArray(repos)
    ? repos.some((r) => String(r?.full_name || r?.name || "").includes("fuelnfreetime"))
    : body?.ok === true;
  return { connected: body?.ok !== false, has_fnf_repo: hasFnf, sample: body };
}

export async function fetchGithubContextForChat(env, message) {
  if (!bridgeConfigured(env)) return null;

  const hay = message.toLowerCase();
  const repo = String(env.FNF_GITHUB_REPO || FNF_GITHUB_REPO);

  if (/github|repo|commit|branch|pr|pull request|code|deploy|worker|migration/.test(hay)) {
    const branches = await callMcpTool(env, "agentsam_github_branch_list", { repo });
    const branchBody = parseToolText(branches);
    if (branchBody?.ok === false && branchBody?.error === "github_not_connected") {
      return "GITHUB MCP: not connected — connect GitHub via IAM integrations (see MCP connect URLs in admin).";
    }
    if (branchBody?.ok !== false) {
      const names = (branchBody?.branches || [])
        .slice(0, 6)
        .map((b) => b.name)
        .filter(Boolean);
      return `GITHUB MCP (via bridge):\nRepo: ${repo}\nBranches: ${names.join(", ") || "(none listed)"}`;
    }
  }

  if (/search|find|where is|locate/.test(hay)) {
    const q = message.replace(/\b(search|find|where is|locate|in repo|github)\b/gi, "").trim().slice(0, 120);
    if (q.length > 2) {
      const search = await callMcpTool(env, "agentsam_github_search_code", {
        repo,
        query: `${q} repo:${repo}`,
      });
      const searchBody = parseToolText(search);
      if (searchBody?.ok !== false && searchBody?.items) {
        const hits = searchBody.items
          .slice(0, 5)
          .map((i) => `- ${i.path}`)
          .join("\n");
        return `GITHUB CODE SEARCH:\n${hits || "(no hits)"}`;
      }
    }
  }

  return null;
}

export function mcpConnectUrls(env) {
  const iam = iamOrigin(env);
  const mcpBase = mcpUrl(env).replace(/\/mcp\/?$/, "");
  return {
    iam_mcp_connect: `${mcpBase}/auth/connect`,
    iam_mcp_authorize: `${mcpBase}/auth/authorize`,
    iam_github_oauth: `${iam}/api/oauth/github/start?return_to=${encodeURIComponent("/dashboard/settings/integrations")}`,
    iam_integrations: `${iam}/dashboard/settings/integrations`,
  };
}
