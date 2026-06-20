/**
 * MCP server registry — prepared connections for Agent Sam routing.
 * Execution wiring lands in a later pass; routing + UI surfacing now.
 */

export const MCP_SERVERS = [
  {
    id: "mcp_github",
    slug: "github",
    display_name: "GitHub",
    description: "Repo issues, PRs, file context, and code search for fuelnfreetime.",
    url: "https://api.githubcopilot.com/mcp/",
    transport: "stdio_or_remote",
    status: "planned",
    auth_type: "oauth",
    tool_lanes: ["repo", "code"],
    repos: ["SamPrimeaux/fuelnfreetime"],
    env_secrets: ["GITHUB_MCP_TOKEN"],
  },
  {
    id: "mcp_inneranimalmedia",
    slug: "inneranimalmedia-mcp-server",
    display_name: "Inner Animal MCP",
    description: "Platform tools, D1, Workers, and cross-project dispatch (dev).",
    url: "https://mcp.inneranimalmedia.com",
    transport: "remote_sse",
    status: "dev",
    auth_type: "workspace_token",
    tool_lanes: ["database", "terminal", "repo", "memory"],
    env_secrets: ["IAM_MCP_TOKEN"],
  },
];

export function listMcpServersForUi() {
  return MCP_SERVERS.map((s) => ({
    id: s.id,
    slug: s.slug,
    display_name: s.display_name,
    description: s.description,
    status: s.status,
    tool_lanes: s.tool_lanes,
    connected: s.status === "ready",
  }));
}

export function selectMcpServers(intent, message) {
  const hay = `${intent} ${message}`.toLowerCase();
  const picked = [];

  for (const server of MCP_SERVERS) {
    let score = 0;
    if (intent === "code" || intent === "deploy") score += 3;
    if (/github|pr|pull request|commit|repo|branch|issue/.test(hay) && server.slug === "github") {
      score += 5;
    }
    if (/d1|worker|cloudflare|deploy|inneranimal|platform|mcp/.test(hay) && server.slug.includes("inneranimalmedia")) {
      score += 4;
    }
    if (server.tool_lanes.some((lane) => hay.includes(lane))) score += 1;
    if (score > 0) picked.push({ server, score });
  }

  picked.sort((a, b) => b.score - a.score);
  return picked.slice(0, 2).map((p) => p.server);
}

export function formatMcpForPrompt(servers) {
  if (!servers?.length) return "";
  const lines = servers.map(
    (s) =>
      `- ${s.display_name} (${s.slug}) — ${s.description} [status: ${s.status}]`
  );
  return `MCP TOOL LANES (use when task requires; note connection status):\n${lines.join("\n")}`;
}
