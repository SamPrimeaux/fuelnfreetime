# Agent skills (Fuel & Free Time)

Project-scoped Cursor agent skills. **Runtime copy** lives in R2 `agentsam/skills/` with D1 registry — sync via `npm run agentsam:skills:sync`. See [`docs/AGENTSAM-SKILLS.md`](../docs/AGENTSAM-SKILLS.md).

## Stripe skills (upstream)

Vendored from [stripe/ai](https://github.com/stripe/ai/tree/main/skills) — synced 2026-06-20.

| Skill | Use when |
|-------|----------|
| [`stripe-best-practices`](stripe-best-practices/SKILL.md) | Building or reviewing payments, webhooks, Checkout Sessions, security |
| [`stripe-directory`](stripe-directory/SKILL.md) | Finding Stripe docs and MCP tools |
| [`stripe-projects`](stripe-projects/SKILL.md) | Stripe Projects / multi-environment keys |
| [`upgrade-stripe`](upgrade-stripe/SKILL.md) | Upgrading Stripe API version or SDK |

**Fuel & Free Time Stripe work:** also read [`docs/RUNTIME-CONTRACTS-STRIPE.md`](../docs/RUNTIME-CONTRACTS-STRIPE.md) before implementing — repo-specific order flow, D1 schema, and inventory rules override generic Stripe guidance where they differ.

---

# Skills (Stripe upstream README)

Agents need instructions to follow. The better the instructions, the more likely the agent will be able to do something useful for/with their user.

Stripe has:

- LLM readable Docs (append .md to the end of any Docs)
- `search_stripe_documentation` tool built into our MCP server
- MCP Prompts
- Agent skills

This folder is a collection of [agent skills](https://agentskills.io) to steer your agents to build optimal Stripe integrations. These are synced automatically from [docs.stripe.com/.well-known/skills](https://docs.stripe.com/.well-known/skills) via the [sync-skills workflow](https://github.com/stripe/ai/blob/main/.github/workflows/sync-skills.yml).
