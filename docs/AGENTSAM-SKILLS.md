# Agent Sam skills — Fuel & Free Time

Aligned with **inneranimalmedia** `agentsam_skill` / `agentsam_hook` / `agentsam_webhooks` pattern.

## Storage model

| Layer | Location | Role |
|-------|----------|------|
| **D1** | `agentsam_skill` | IAM-parity registry + `slug` (FNF API); `retrieval_strategy = r2` |
| **D1** | `agentsam_skill_file` | Reference markdown paths (`references/*.md`) |
| **D1** | `agentsam_hook` | Deploy / automation hooks |
| **D1** | `agentsam_webhooks` | Inbound webhook registry (Stripe, GitHub, Resend) |
| **D1** | `agentsam_webhook_events` | Webhook event log + processing status |
| **D1** | `agentsam_mcp_workflows` | Minimal MCP step-graph FK target for hooks |
| **D1** | `agentsam_workflows` | Canonical workflow registry (IAM parity) |
| **D1** | `agentsam_ai` | Workers AI model registry + routed fallbacks |
| **D1** | `agentsam_analytics` | Event ledger (chat, routing, MCP, AI cost) |
| **D1** | `agentsam_tools` | Tool catalog SSOT (handlers, MCP bridge, store/CMS) |
| **D1** | `agentsam_mcp_servers` | MCP server registry |
| **D1** | `agentsam_tool_policy_keys` | Chat allowlists / non-cacheable policies |
| **D1** | `agentsam_tool_chain` | Multi-step tool execution chain |
| **D1** | `agentsam_tool_call_log` | Hot tool invocation log |
| **D1** | `agentsam_tool_stats_compacted` | Rolled-up tool reliability stats |
| **D1** | `agentsam_workflow_nodes` | Step graph per workflow (trigger → output spine) |
| **R2** | `agentsam/skills/{slug}/…` on `WEBSITE_ASSETS` | Markdown bodies |
| **Repo** | `.cursor/skills/` | Cursor source → synced to R2 |

### Tenant IDs

| Key | Value |
|-----|-------|
| `tenant_id` | `tenant_fuelnfreetime` |
| `workspace_id` | `ws_fuelnfreetime` |
| `user_id` (system) | `au_fnf_system` |

Skill domain (`stripe`, `commerce`, `platform`) lives in `metadata_json.skill_domain` — IAM `scope` is always `tenant` for this project.

## Project context (Layer 0 compass)

| Database | Row ID | Tenant / workspace |
|----------|--------|-------------------|
| **fuelnfreetime** (worker) | `ctx_fuelnfreetime` | `tenant_fuelnfreetime` / `ws_fuelnfreetime` |
| **inneranimalmedia-business** (IAM) | `ctx_fuelnfreetime` | `tenant_sam_primeaux` / `ws_inneranimalmedia` |

```bash
npm run db:seed:ctx-fuelnfreetime:all
```

Schema: `db/migrate-agentsam-project-context.sql` · Seeds: `db/seed-ctx-fuelnfreetime-worker.sql`, `db/seed-ctx-fuelnfreetime-iam.sql`

---

```bash
# Full platform schema (destructive to agentsam_skill — re-seed after)
npm run db:migrate:agentsam-platform

# Hooks + webhook registry seeds
npm run db:seed:agentsam-platform

# R2 upload + skill registry + runs migrate + both seeds
npm run agentsam:skills:sync
```

```bash
# Full platform schema (destructive to agentsam_skill — re-seed after)
npm run db:migrate:agentsam-platform

# Cloudflare skills → .cursor/skills → R2 + D1
npm run agentsam:skills:install-cf
npm run agentsam:skills:sync

# Or one shot:
npm run agentsam:skills:install
```

### Cloudflare skill pack (AgentSam)

| slug | always_apply | domain |
|------|--------------|--------|
| `fnf-cloudflare-runtime` | yes | FNF bindings, deploy, bridge, Workers AI |
| `cloudflare` | no | Platform overview |
| `wrangler` | no | CLI, secrets, bindings |
| `workers-best-practices` | no | Production Worker patterns |
| `durable-objects` | no | CMS_EDITOR DO |
| `agents-sdk` | no | Agents SDK |
| `building-mcp-server-on-cloudflare` | no | IAM MCP bridge |
| `building-ai-agent-on-cloudflare` | no | Agent chat patterns |
| `web-perf` | no | Storefront performance |

Chat resolver loads up to **3 skills**: always-on `fnf-cloudflare-runtime` + best matches (Cloudflare domain boosted for worker/d1/deploy/MCP messages).

```bash
npm run db:install:agentsam-tools   # migrate + seed tools platform
npm run db:install:agentsam-ai      # migrate + seed AI model registry
```

`npm run deploy` runs `wrangler deploy --install-skills` to refresh IDE agent skills.

## Admin API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/agentsam/skills` | List skills (`?hydrate=1` loads R2) |
| `GET` | `/api/admin/agentsam/skills/:slug` | One skill + references |
| `GET` | `/api/admin/agentsam/status` | Workers AI + workflows + MCP prep status |
| `GET` | `/api/admin/agentsam/tools` | Quick actions + MCP servers + tool catalog |
| `GET` | `/api/admin/agentsam/tools/catalog` | Tools grouped by category |
| `GET` | `/api/admin/agentsam/workflows` | Studio workflow list |
| `POST` | `/api/admin/agentsam/chat` | Single input chat with intent routing |

## Admin UI

- **`/admin/agentsam`** — full-page GPT-style AgentSam (one input, auto-routing)
- Sidenav label: **AgentSam** (Sales channels)
- Drawer (`agentsam.js`) still available from top bar on other admin pages

## MCP prep (config)

Registry: `src/agentsam/mcp-servers.js`

| slug | purpose | auth |
|------|---------|------|
| `inneranimalmedia-mcp-server` | Platform D1 / Workers / GitHub catalog | `AGENTSAM_BRIDGE_KEY` (IAM bridge) |
| `github` | Repo tools via IAM MCP | GitHub OAuth on IAM + bridge dispatch |

```bash
npx wrangler secret put AGENTSAM_BRIDGE_KEY
```

Drawer lists **Content Studio**, **Creative Studio**, **Brand Refresh** by `metadata_json.ui_label`; selected `workflow_key` overrides auto-routing.


| slug | provider | endpoint |
|------|----------|----------|
| `stripe-checkout` | stripe | `/api/store/webhooks/stripe` |
| `github-push` | github | `/api/agentsam/webhooks/github` |
| `resend-events` | resend | `/api/agentsam/webhooks/resend` |

Rows seeded with `is_active = 0` until routes + secrets are wired.

## Schema files

- `db/migrate-agentsam-workflows.sql` — workflow registry
- `db/migrate-agentsam-workflows-v2.sql` — `created_at_unix`, `agentsam_workflow_nodes`
- `db/seed-agentsam-workflows-studio.sql` — Content / Creative / Brand Refresh pack
- `db/seed-agentsam-workflow-nodes-studio.sql` — 7-step node graphs for studio workflows
- `db/seed-agentsam-platform.sql` — hooks, workflows, webhook registry
- `db/seed-agentsam-skills.sql` — generated by sync script

## Code

- `src/agentsam/constants.js` — tenant/workspace IDs
- `src/agentsam/skill-r2.js` — R2 hydration
- `src/agentsam/skills.js` — list/get/match for chat
- `scripts/sync-agentsam-skills.mjs` — R2 + D1 sync
