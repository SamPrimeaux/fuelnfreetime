# Fuel & Free Time — GitHub OAuth App for AgentSam

AgentSam GitHub access is **scoped to `SamPrimeaux/fuelnfreetime` only** (enforced in code).

## Option A — Service token (fastest, already wired)

Fine-grained PAT with **Repository access: only `fuelnfreetime`** and contents read (+ metadata read):

```bash
npx wrangler secret put FNF_GITHUB_TOKEN
# paste fine-grained PAT (repo: SamPrimeaux/fuelnfreetime only)
```

## Option B — Per-admin OAuth app (recommended for Justin/Connor)

1. Open https://github.com/settings/developers → **New OAuth App**
2. **Application name:** `Fuel & Free Time AgentSam`
3. **Homepage URL:** `https://fuelnfreetime.com/admin/agentsam`
4. **Authorization callback URL:** `https://fuelnfreetime.com/api/admin/agentsam/github/callback`

**Or** add that callback URL to the existing IAM OAuth app (`Ov23li6BZYxjVtGUWibX`) under GitHub → Settings → Developer settings → OAuth Apps.

5. Copy **Client ID** and generate **Client secret**

```bash
# Client ID is already in wrangler.toml as FNF_GITHUB_CLIENT_ID for the shared IAM app
npx wrangler secret put FNF_GITHUB_CLIENT_SECRET
npx wrangler deploy
```

6. In admin, open `/admin/agentsam` → **Connect GitHub**
7. OAuth verifies the account can access `SamPrimeaux/fuelnfreetime` before saving the token

## D1 migration

```bash
npm run db:migrate:admin-github
```

## Bridge (IAM MCP)

`AGENTSAM_BRIDGE_KEY` on the `fuelnfreetime` Worker must match IAM MCP. GitHub via bridge uses IAM `GITHUB_TOKEN` on `inneranimalmedia-mcp-server` (synced separately).
