---
name: fnf-cloudflare-runtime
description: Fuel & Free Time Cloudflare Worker runtime — bindings, deploy, AgentSam bridge, D1/R2/KV/DO/Workers AI. Always apply for platform and deploy questions on this repo.
---

# FNF Cloudflare runtime (always-on for AgentSam)

**Worker:** `fuelnfreetime` · **Repo:** `SamPrimeaux/fuelnfreetime`  
**Production:** https://fuelnfreetime.com · **Workers dev:** https://fuelnfreetime.meauxbility.workers.dev

## Bindings (`wrangler.toml`)

| Binding | Resource | AgentSam / product use |
|---------|----------|------------------------|
| `DB` | D1 `fuelnfreetime` (`9fd6ff92-e407-4b51-8b01-3c93f3845bb2`) | Commerce, CMS, auth, `agentsam_skill`, `agentsam_workflows` |
| `WEBSITE_ASSETS` | R2 `fuelnfreetime` | `/media/*`, `agentsam/skills/*` bodies |
| `CMS_CACHE` | KV | Published CMS snapshots, OAuth state |
| `CMS_EDITOR` | DO `CmsEditorRoom` | Live CMS WebSocket rooms |
| `ASSETS` | Static + admin UI | `public/`, `run_worker_first = true` |
| `AGENTSAM_WAI` | Workers AI | Admin chat — models via fallback chain in `src/agentsam/ai-run.js` |

## Secrets (never in git)

| Secret | Purpose |
|--------|---------|
| `AGENTSAM_BRIDGE_KEY` | Service trust to `inneranimalmedia-mcp-server` (same IAM bridge) |
| `FNF_GITHUB_TOKEN` | Repo-scoped GitHub API (`SamPrimeaux/fuelnfreetime` only) |
| `FNF_GITHUB_CLIENT_SECRET` | Admin GitHub OAuth callback |

## AgentSam platform IDs

- `tenant_fuelnfreetime` / `ws_fuelnfreetime` / `au_fnf_system`
- MCP URL: `https://mcp.inneranimalmedia.com/mcp` (Bearer bridge key)
- GitHub repo allowlist: `SamPrimeaux/fuelnfreetime`

## Deploy & D1

```bash
npm run deploy                 # admin SPA build + wrangler deploy
npm run db:migrate             # schema.sql remote
npm run agentsam:skills:sync   # R2 agentsam/skills + D1 agentsam_skill
npx wrangler secret put NAME   # secrets only via wrangler
```

**D1 rule:** multi-statement migrations with commas break `wrangler d1 execute --file` — use `scripts/apply-*.sh` one statement per `--command` when needed.

## Workers AI (AgentSam chat)

- Do **not** use retired `@cf/meta/llama-3.1-8b-instruct`
- Use fallback chain: `llama-3.2-3b-instruct` → `llama-3.1-8b-instruct-fp8` → `llama-3.3-70b-instruct-fp8-fast`
- Keep system context trimmed; skills hydrate from R2

## Related skills (load when task matches)

| Task | Skill slug |
|------|------------|
| Wrangler deploy, secrets, bindings | `wrangler` |
| Worker code review / anti-patterns | `workers-best-practices` |
| D1 / DO / platform overview | `cloudflare`, `durable-objects` |
| AgentSam MCP / bridge | `building-mcp-server-on-cloudflare`, `agents-sdk` |
| Storefront performance | `web-perf` |

## Do not

- Invent inventory, orders, or CMS publish state — read D1/KV
- Bypass `docs/RUNTIME-CONTRACTS-*.md` for commerce/Stripe
- Patch production from IAM `ctx_inneranimalmedia` — use `ctx_fuelnfreetime`
