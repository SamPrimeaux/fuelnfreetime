# Agent Sam skills — Fuel & Free Time

Aligned with **inneranimalmedia** `agentsam_skill` pattern:

| Layer | Location | Role |
|-------|----------|------|
| **D1** | `agentsam_skill`, `agentsam_skill_file` | Lightweight registry (slug, description, R2 keys, tags, scope) |
| **R2** | `agentsam/skills/{slug}/…` on `WEBSITE_ASSETS` | Markdown bodies (SKILL.md + references) |
| **Repo source** | `.cursor/skills/` | Cursor IDE + sync source of truth for vendored skills |
| **Repo contracts** | `docs/RUNTIME-CONTRACTS-*.md` | Synced to R2 as `fnf-commerce-runtime`, `fnf-stripe-runtime` |

## Sync (R2 + D1)

```bash
npm run agentsam:skills:sync
```

This script:

1. Uploads `.cursor/skills/**/*.md` → `r2://fuelnfreetime/agentsam/skills/…`
2. Uploads commerce + Stripe runtime docs as Agent Sam skills
3. Applies `db/migrate-agentsam-skills.sql` if needed
4. Regenerates + applies `db/seed-agentsam-skills.sql`

## Admin API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/admin/agentsam/skills` | List registry (`?hydrate=1` loads R2 bodies) |
| `GET` | `/api/admin/agentsam/skills/:slug` | One skill + references from R2 |
| `GET` | `/api/admin/agentsam/status` | Includes `skills_registered` count |

Agent Sam chat auto-injects matched skills into the system prompt (stripe/commerce keywords + admin page context).

## Scopes

| scope | Skills |
|-------|--------|
| `stripe` | stripe-best-practices, stripe-directory, stripe-projects, upgrade-stripe, fnf-stripe-runtime |
| `commerce` | fnf-commerce-runtime |
| `platform` | other skills |

## Connor / agents

- Edit skills in `.cursor/skills/` (Cursor) **or** update runtime contracts in `docs/`
- Run `npm run agentsam:skills:sync` before deploy so Agent Sam on production matches repo
- Do **not** store skill bodies in D1 — `retrieval_strategy = 'r2'` only

Upstream Stripe skills: [stripe/ai](https://github.com/stripe/ai/tree/main/skills/stripe-best-practices)
