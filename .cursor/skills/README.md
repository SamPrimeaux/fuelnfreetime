# Agent skills (Fuel & Free Time)

Project-scoped Cursor agent skills. **Runtime copy** lives in R2 `agentsam/skills/` with D1 registry — sync via `npm run agentsam:skills:sync`. See [`docs/AGENTSAM-SKILLS.md`](../docs/AGENTSAM-SKILLS.md).

## Cloudflare skills (AgentSam platform)

Vendored from the [Cursor Cloudflare plugin](https://github.com/cloudflare) / `wrangler deploy --install-skills`.

```bash
npm run agentsam:skills:install-cf   # copy into .cursor/skills/
npm run agentsam:skills:install      # install + R2 + D1 sync
```

| Skill | Use when |
|-------|----------|
| [`fnf-cloudflare-runtime`](fnf-cloudflare-runtime/SKILL.md) | **Always-on** — FNF bindings, secrets, deploy, bridge, Workers AI |
| [`cloudflare`](cloudflare/SKILL.md) | Platform overview, product routing |
| [`wrangler`](wrangler/SKILL.md) | Deploy, secrets, bindings, CLI |
| [`workers-best-practices`](workers-best-practices/SKILL.md) | Worker code review, anti-patterns |
| [`durable-objects`](durable-objects/SKILL.md) | CMS_EDITOR DO, stateful coordination |
| [`agents-sdk`](agents-sdk/SKILL.md) | Agents SDK patterns |
| [`building-mcp-server-on-cloudflare`](building-mcp-server-on-cloudflare/SKILL.md) | Inner Animal MCP bridge |
| [`building-ai-agent-on-cloudflare`](building-ai-agent-on-cloudflare/SKILL.md) | Agent chat / tool calling |
| [`web-perf`](web-perf/SKILL.md) | Storefront Core Web Vitals |

## Stripe skills (upstream)

Vendored from [stripe/ai](https://github.com/stripe/ai/tree/main/skills) — synced 2026-06-20.

| Skill | Use when |
|-------|----------|
| [`stripe-best-practices`](stripe-best-practices/SKILL.md) | Building or reviewing payments, webhooks, Checkout Sessions, security |
| [`stripe-directory`](stripe-directory/SKILL.md) | Finding Stripe docs and MCP tools |
| [`stripe-projects`](stripe-projects/SKILL.md) | Stripe Projects / multi-environment keys |
| [`upgrade-stripe`](upgrade-stripe/SKILL.md) | Upgrading Stripe API version or SDK |

**Fuel & Free Time Stripe work:** also read [`docs/RUNTIME-CONTRACTS-STRIPE.md`](../docs/RUNTIME-CONTRACTS-STRIPE.md) before implementing — repo-specific order flow, D1 schema, and inventory rules override generic Stripe guidance where they differ.
