import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

test("FNF AgentSam displays only backend-discovered MCP connections",()=>{
  const source=readFileSync("apps/ecommerce-cms-agentsam/frontend/static/js/agentsam-page.js","utf8");
  assert.doesNotMatch(source,/FALLBACK_MCP_SERVERS/);
  assert.match(source,/const incoming = Array\.isArray\(data\.mcp_servers\) \? data\.mcp_servers : \[\]/);
  assert.match(source,/filter\(\(server\) => server\.connected === true\)/);
  assert.match(source,/const active = mcpServers\.filter\(\(s\) => s\.connected === true && activeConnections\.has\(s\.slug\)\)/);
  assert.match(source,/mcp_servers: \[\], quick_actions: \[\]/);
  assert.doesNotMatch(source,/if \(!mcpServers\.length\) mcpServers/);
});
