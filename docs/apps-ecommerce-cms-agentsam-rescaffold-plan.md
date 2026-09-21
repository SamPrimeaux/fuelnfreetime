# Fuel & Free Time → apps/ecommerce-cms-agentsam — rescaffold plan

This is the reference doc for the in-progress restructure: stop patching
`fuelnfreetime` in place forever, and instead land new/touched work at the
path it should live at once this becomes a dual-purpose product — the live
deployed site **and** a reusable app package inside `agentsam-sdk`.

**Working rule going forward:** new frontend/backend work that's part of the
React-port effort lands under `apps/ecommerce-cms-agentsam/` (see target tree
below), not at the current root paths. The root paths stay live and
deploying until the physical move happens; the target tree is where new
components should be *authored*, then the deploy config catches up in one
dedicated pass (see "The move itself" at the bottom).

---

## ADMIN_CLEAN_PAGES — the legacy-vs-SPA split, in full

This is the single piece of code deciding whether a given `/admin/<page>`
URL is served as a static legacy HTML file or handed to the React SPA. It's
the thing that silently ate the first AccountPage build, and it's the
literal checklist of what's still left to port.

`src/lib/admin-routes.js`:

```js
export const ADMIN_CLEAN_PAGES = new Set([
  "login",
  "home",
  "orders",
  "products",
  "product-edit",
  "inventory",
  "subscribers",
  "growth",
  "discounts",
  "scaffold",
  "content",
  "pages",
  "page-edit",
  "theme-editor",
  "store",
  "preferences",
  "email",
  "agentsam",
]);
```

Anything in this Set gets its clean URL (`/admin/orders`) rewritten to the
static file (`/admin/orders.html`) by `adminHtmlFile()` in
`src/index.js` — **before** the request ever reaches SPA routing logic.
`account` and `analytics` are deliberately absent: those two are handled by
an explicit SPA-match block further down in `src/index.js` instead:

```js
const analyticsViewMatch = path.match(/^\/admin\/analytics\/(overview|finance|health)\/?$/);
const accountViewMatch = path === "/admin/account" || path === "/admin/account/";

if (analyticsViewMatch || accountViewMatch) {
  const user = await getSessionUser(request, env);
  if (!user) return noStore(redirectToAdminLogin(request));
  const indexUrl = new URL(request.url);
  indexUrl.pathname = ADMIN_SPA_INDEX; // /admin/_spa/index.html
  indexUrl.search = "";
  return noStore(await env.ASSETS.fetch(new Request(indexUrl, request)));
}
```

**The pattern for porting any remaining page:**
1. Remove its name from `ADMIN_CLEAN_PAGES` in `src/lib/admin-routes.js`.
2. Add a matching SPA-route condition in `src/index.js` (copy the
   `accountViewMatch` shape above).
3. Build the real React page + route + nav entry in `admin-ui/`.
4. Leave the old `public/admin/<page>.html` + its `.js` in place until the
   React version is verified live — don't delete source you might need to
   compare against.

**Remaining legacy pages (the actual migration checklist):**

| Page | Static file | Notes |
|---|---|---|
| `home` | `public/admin/home.html` | |
| `orders` | `public/admin/orders.html` | |
| `products` | `public/admin/products.html` | |
| `product-edit` | `public/admin/product-edit.html` | |
| `inventory` | `public/admin/inventory.html` | |
| `subscribers` | `public/admin/subscribers.html` | Customers |
| `growth` | `public/admin/growth.html` | |
| `discounts` | `public/admin/discounts.html` | |
| `content` | `public/admin/content.html` | |
| `pages` / `page-edit` | `public/admin/pages.html`, `page-edit.html` | CMS page editor |
| `theme-editor` | `public/admin/theme-editor.html` | |
| `store` | `public/admin/store.html` | Online Store settings |
| `preferences` | `public/admin/preferences.html` | |
| `agentsam` | `public/admin/agentsam.html` (+ `app/frontend/admin/agentsam/`) | Already has its own real backend — biggest single port |
| `login` | `public/admin/login.html` | Probably **stays** static forever — pre-auth, no reason to ship the SPA bundle for it |
| `scaffold` | `public/admin/scaffold.html` | Dev-only utility — low priority |

**Ported so far:** `account` ✅ (this session)

---

## Current file tree (as of this doc, 696 tracked files)

```
.cursor/skills/README.md
.cursor/skills/agents-sdk/SKILL.md
.cursor/skills/agents-sdk/references/callable.md
.cursor/skills/agents-sdk/references/codemode.md
.cursor/skills/agents-sdk/references/email.md
.cursor/skills/agents-sdk/references/mcp.md
.cursor/skills/agents-sdk/references/state-scheduling.md
.cursor/skills/agents-sdk/references/streaming-chat.md
.cursor/skills/agents-sdk/references/workflows.md
.cursor/skills/building-ai-agent-on-cloudflare/SKILL.md
.cursor/skills/building-ai-agent-on-cloudflare/references/agent-patterns.md
.cursor/skills/building-ai-agent-on-cloudflare/references/examples.md
.cursor/skills/building-ai-agent-on-cloudflare/references/state-patterns.md
.cursor/skills/building-ai-agent-on-cloudflare/references/troubleshooting.md
.cursor/skills/building-mcp-server-on-cloudflare/SKILL.md
.cursor/skills/building-mcp-server-on-cloudflare/references/examples.md
.cursor/skills/building-mcp-server-on-cloudflare/references/oauth-setup.md
.cursor/skills/building-mcp-server-on-cloudflare/references/troubleshooting.md
.cursor/skills/cloudflare/SKILL.md
.cursor/skills/cloudflare/references/agents-sdk/README.md
.cursor/skills/cloudflare/references/agents-sdk/api.md
.cursor/skills/cloudflare/references/agents-sdk/configuration.md
.cursor/skills/cloudflare/references/agents-sdk/gotchas.md
.cursor/skills/cloudflare/references/agents-sdk/patterns.md
.cursor/skills/cloudflare/references/ai-gateway/README.md
.cursor/skills/cloudflare/references/ai-gateway/configuration.md
.cursor/skills/cloudflare/references/ai-gateway/dynamic-routing.md
.cursor/skills/cloudflare/references/ai-gateway/features.md
.cursor/skills/cloudflare/references/ai-gateway/sdk-integration.md
.cursor/skills/cloudflare/references/ai-gateway/troubleshooting.md
.cursor/skills/cloudflare/references/ai-search/README.md
.cursor/skills/cloudflare/references/ai-search/api.md
.cursor/skills/cloudflare/references/ai-search/configuration.md
.cursor/skills/cloudflare/references/ai-search/gotchas.md
.cursor/skills/cloudflare/references/ai-search/patterns.md
.cursor/skills/cloudflare/references/analytics-engine/README.md
.cursor/skills/cloudflare/references/analytics-engine/api.md
.cursor/skills/cloudflare/references/analytics-engine/configuration.md
.cursor/skills/cloudflare/references/analytics-engine/gotchas.md
.cursor/skills/cloudflare/references/analytics-engine/patterns.md
.cursor/skills/cloudflare/references/api-shield/README.md
.cursor/skills/cloudflare/references/api-shield/api.md
.cursor/skills/cloudflare/references/api-shield/configuration.md
.cursor/skills/cloudflare/references/api-shield/gotchas.md
.cursor/skills/cloudflare/references/api-shield/patterns.md
.cursor/skills/cloudflare/references/api/README.md
.cursor/skills/cloudflare/references/api/api.md
.cursor/skills/cloudflare/references/api/configuration.md
.cursor/skills/cloudflare/references/api/gotchas.md
.cursor/skills/cloudflare/references/api/patterns.md
.cursor/skills/cloudflare/references/argo-smart-routing/README.md
.cursor/skills/cloudflare/references/argo-smart-routing/api.md
.cursor/skills/cloudflare/references/argo-smart-routing/configuration.md
.cursor/skills/cloudflare/references/argo-smart-routing/gotchas.md
.cursor/skills/cloudflare/references/argo-smart-routing/patterns.md
.cursor/skills/cloudflare/references/bindings/README.md
.cursor/skills/cloudflare/references/bindings/api.md
.cursor/skills/cloudflare/references/bindings/configuration.md
.cursor/skills/cloudflare/references/bindings/gotchas.md
.cursor/skills/cloudflare/references/bindings/patterns.md
.cursor/skills/cloudflare/references/bot-management/README.md
.cursor/skills/cloudflare/references/bot-management/api.md
.cursor/skills/cloudflare/references/bot-management/configuration.md
.cursor/skills/cloudflare/references/bot-management/gotchas.md
.cursor/skills/cloudflare/references/bot-management/patterns.md
.cursor/skills/cloudflare/references/browser-rendering/README.md
.cursor/skills/cloudflare/references/browser-rendering/api.md
.cursor/skills/cloudflare/references/browser-rendering/configuration.md
.cursor/skills/cloudflare/references/browser-rendering/gotchas.md
.cursor/skills/cloudflare/references/browser-rendering/patterns.md
.cursor/skills/cloudflare/references/c3/README.md
.cursor/skills/cloudflare/references/c3/api.md
.cursor/skills/cloudflare/references/c3/configuration.md
.cursor/skills/cloudflare/references/c3/gotchas.md
.cursor/skills/cloudflare/references/c3/patterns.md
.cursor/skills/cloudflare/references/cache-reserve/README.md
.cursor/skills/cloudflare/references/cache-reserve/api.md
.cursor/skills/cloudflare/references/cache-reserve/configuration.md
.cursor/skills/cloudflare/references/cache-reserve/gotchas.md
.cursor/skills/cloudflare/references/cache-reserve/patterns.md
.cursor/skills/cloudflare/references/containers/README.md
.cursor/skills/cloudflare/references/containers/api.md
.cursor/skills/cloudflare/references/containers/configuration.md
.cursor/skills/cloudflare/references/containers/gotchas.md
.cursor/skills/cloudflare/references/containers/patterns.md
.cursor/skills/cloudflare/references/cron-triggers/README.md
.cursor/skills/cloudflare/references/cron-triggers/api.md
.cursor/skills/cloudflare/references/cron-triggers/configuration.md
.cursor/skills/cloudflare/references/cron-triggers/gotchas.md
.cursor/skills/cloudflare/references/cron-triggers/patterns.md
.cursor/skills/cloudflare/references/d1/README.md
.cursor/skills/cloudflare/references/d1/api.md
.cursor/skills/cloudflare/references/d1/configuration.md
.cursor/skills/cloudflare/references/d1/gotchas.md
.cursor/skills/cloudflare/references/d1/patterns.md
.cursor/skills/cloudflare/references/ddos/README.md
.cursor/skills/cloudflare/references/ddos/api.md
.cursor/skills/cloudflare/references/ddos/configuration.md
.cursor/skills/cloudflare/references/ddos/gotchas.md
.cursor/skills/cloudflare/references/ddos/patterns.md
.cursor/skills/cloudflare/references/do-storage/README.md
.cursor/skills/cloudflare/references/do-storage/api.md
.cursor/skills/cloudflare/references/do-storage/configuration.md
.cursor/skills/cloudflare/references/do-storage/gotchas.md
.cursor/skills/cloudflare/references/do-storage/patterns.md
.cursor/skills/cloudflare/references/do-storage/testing.md
.cursor/skills/cloudflare/references/durable-objects/README.md
.cursor/skills/cloudflare/references/durable-objects/api.md
.cursor/skills/cloudflare/references/durable-objects/configuration.md
.cursor/skills/cloudflare/references/durable-objects/gotchas.md
.cursor/skills/cloudflare/references/durable-objects/patterns.md
.cursor/skills/cloudflare/references/email-routing/README.md
.cursor/skills/cloudflare/references/email-routing/api.md
.cursor/skills/cloudflare/references/email-routing/configuration.md
.cursor/skills/cloudflare/references/email-routing/gotchas.md
.cursor/skills/cloudflare/references/email-routing/patterns.md
.cursor/skills/cloudflare/references/email-workers/README.md
.cursor/skills/cloudflare/references/email-workers/api.md
.cursor/skills/cloudflare/references/email-workers/configuration.md
.cursor/skills/cloudflare/references/email-workers/gotchas.md
.cursor/skills/cloudflare/references/email-workers/patterns.md
.cursor/skills/cloudflare/references/hyperdrive/README.md
.cursor/skills/cloudflare/references/hyperdrive/api.md
.cursor/skills/cloudflare/references/hyperdrive/configuration.md
.cursor/skills/cloudflare/references/hyperdrive/gotchas.md
.cursor/skills/cloudflare/references/hyperdrive/patterns.md
.cursor/skills/cloudflare/references/images/README.md
.cursor/skills/cloudflare/references/images/api.md
.cursor/skills/cloudflare/references/images/configuration.md
.cursor/skills/cloudflare/references/images/gotchas.md
.cursor/skills/cloudflare/references/images/patterns.md
.cursor/skills/cloudflare/references/kv/README.md
.cursor/skills/cloudflare/references/kv/api.md
.cursor/skills/cloudflare/references/kv/configuration.md
.cursor/skills/cloudflare/references/kv/gotchas.md
.cursor/skills/cloudflare/references/kv/patterns.md
.cursor/skills/cloudflare/references/miniflare/README.md
.cursor/skills/cloudflare/references/miniflare/api.md
.cursor/skills/cloudflare/references/miniflare/configuration.md
.cursor/skills/cloudflare/references/miniflare/gotchas.md
.cursor/skills/cloudflare/references/miniflare/patterns.md
.cursor/skills/cloudflare/references/network-interconnect/README.md
.cursor/skills/cloudflare/references/network-interconnect/api.md
.cursor/skills/cloudflare/references/network-interconnect/configuration.md
.cursor/skills/cloudflare/references/network-interconnect/gotchas.md
.cursor/skills/cloudflare/references/network-interconnect/patterns.md
.cursor/skills/cloudflare/references/observability/README.md
.cursor/skills/cloudflare/references/observability/api.md
.cursor/skills/cloudflare/references/observability/configuration.md
.cursor/skills/cloudflare/references/observability/gotchas.md
.cursor/skills/cloudflare/references/observability/patterns.md
.cursor/skills/cloudflare/references/pages-functions/README.md
.cursor/skills/cloudflare/references/pages-functions/api.md
.cursor/skills/cloudflare/references/pages-functions/configuration.md
.cursor/skills/cloudflare/references/pages-functions/gotchas.md
.cursor/skills/cloudflare/references/pages-functions/patterns.md
.cursor/skills/cloudflare/references/pages/README.md
.cursor/skills/cloudflare/references/pages/api.md
.cursor/skills/cloudflare/references/pages/configuration.md
.cursor/skills/cloudflare/references/pages/gotchas.md
.cursor/skills/cloudflare/references/pages/patterns.md
.cursor/skills/cloudflare/references/pipelines/README.md
.cursor/skills/cloudflare/references/pipelines/api.md
.cursor/skills/cloudflare/references/pipelines/configuration.md
.cursor/skills/cloudflare/references/pipelines/gotchas.md
.cursor/skills/cloudflare/references/pipelines/patterns.md
.cursor/skills/cloudflare/references/pulumi/README.md
.cursor/skills/cloudflare/references/pulumi/api.md
.cursor/skills/cloudflare/references/pulumi/configuration.md
.cursor/skills/cloudflare/references/pulumi/gotchas.md
.cursor/skills/cloudflare/references/pulumi/patterns.md
.cursor/skills/cloudflare/references/queues/README.md
.cursor/skills/cloudflare/references/queues/api.md
.cursor/skills/cloudflare/references/queues/configuration.md
.cursor/skills/cloudflare/references/queues/gotchas.md
.cursor/skills/cloudflare/references/queues/patterns.md
.cursor/skills/cloudflare/references/r2-data-catalog/README.md
.cursor/skills/cloudflare/references/r2-data-catalog/api.md
.cursor/skills/cloudflare/references/r2-data-catalog/configuration.md
.cursor/skills/cloudflare/references/r2-data-catalog/gotchas.md
.cursor/skills/cloudflare/references/r2-data-catalog/patterns.md
.cursor/skills/cloudflare/references/r2-sql/README.md
.cursor/skills/cloudflare/references/r2-sql/SKILL.md.backup
.cursor/skills/cloudflare/references/r2-sql/api.md
.cursor/skills/cloudflare/references/r2-sql/configuration.md
.cursor/skills/cloudflare/references/r2-sql/gotchas.md
.cursor/skills/cloudflare/references/r2-sql/patterns.md
.cursor/skills/cloudflare/references/r2/README.md
.cursor/skills/cloudflare/references/r2/api.md
.cursor/skills/cloudflare/references/r2/configuration.md
.cursor/skills/cloudflare/references/r2/gotchas.md
.cursor/skills/cloudflare/references/r2/patterns.md
.cursor/skills/cloudflare/references/realtime-sfu/README.md
.cursor/skills/cloudflare/references/realtime-sfu/api.md
.cursor/skills/cloudflare/references/realtime-sfu/configuration.md
.cursor/skills/cloudflare/references/realtime-sfu/gotchas.md
.cursor/skills/cloudflare/references/realtime-sfu/patterns.md
.cursor/skills/cloudflare/references/realtimekit/README.md
.cursor/skills/cloudflare/references/realtimekit/api.md
.cursor/skills/cloudflare/references/realtimekit/configuration.md
.cursor/skills/cloudflare/references/realtimekit/gotchas.md
.cursor/skills/cloudflare/references/realtimekit/patterns.md
.cursor/skills/cloudflare/references/sandbox/README.md
.cursor/skills/cloudflare/references/sandbox/api.md
.cursor/skills/cloudflare/references/sandbox/configuration.md
.cursor/skills/cloudflare/references/sandbox/gotchas.md
.cursor/skills/cloudflare/references/sandbox/patterns.md
.cursor/skills/cloudflare/references/secrets-store/README.md
.cursor/skills/cloudflare/references/secrets-store/api.md
.cursor/skills/cloudflare/references/secrets-store/configuration.md
.cursor/skills/cloudflare/references/secrets-store/gotchas.md
.cursor/skills/cloudflare/references/secrets-store/patterns.md
.cursor/skills/cloudflare/references/smart-placement/README.md
.cursor/skills/cloudflare/references/smart-placement/api.md
.cursor/skills/cloudflare/references/smart-placement/configuration.md
.cursor/skills/cloudflare/references/smart-placement/gotchas.md
.cursor/skills/cloudflare/references/smart-placement/patterns.md
.cursor/skills/cloudflare/references/snippets/README.md
.cursor/skills/cloudflare/references/snippets/api.md
.cursor/skills/cloudflare/references/snippets/configuration.md
.cursor/skills/cloudflare/references/snippets/gotchas.md
.cursor/skills/cloudflare/references/snippets/patterns.md
.cursor/skills/cloudflare/references/spectrum/README.md
.cursor/skills/cloudflare/references/spectrum/api.md
.cursor/skills/cloudflare/references/spectrum/configuration.md
.cursor/skills/cloudflare/references/spectrum/gotchas.md
.cursor/skills/cloudflare/references/spectrum/patterns.md
.cursor/skills/cloudflare/references/static-assets/README.md
.cursor/skills/cloudflare/references/static-assets/api.md
.cursor/skills/cloudflare/references/static-assets/configuration.md
.cursor/skills/cloudflare/references/static-assets/gotchas.md
.cursor/skills/cloudflare/references/static-assets/patterns.md
.cursor/skills/cloudflare/references/stream/README.md
.cursor/skills/cloudflare/references/stream/api-live.md
.cursor/skills/cloudflare/references/stream/api.md
.cursor/skills/cloudflare/references/stream/configuration.md
.cursor/skills/cloudflare/references/stream/gotchas.md
.cursor/skills/cloudflare/references/stream/patterns.md
.cursor/skills/cloudflare/references/tail-workers/README.md
.cursor/skills/cloudflare/references/tail-workers/api.md
.cursor/skills/cloudflare/references/tail-workers/configuration.md
.cursor/skills/cloudflare/references/tail-workers/gotchas.md
.cursor/skills/cloudflare/references/tail-workers/patterns.md
.cursor/skills/cloudflare/references/terraform/README.md
.cursor/skills/cloudflare/references/terraform/api.md
.cursor/skills/cloudflare/references/terraform/configuration.md
.cursor/skills/cloudflare/references/terraform/gotchas.md
.cursor/skills/cloudflare/references/terraform/patterns.md
.cursor/skills/cloudflare/references/tunnel/README.md
.cursor/skills/cloudflare/references/tunnel/api.md
.cursor/skills/cloudflare/references/tunnel/configuration.md
.cursor/skills/cloudflare/references/tunnel/gotchas.md
.cursor/skills/cloudflare/references/tunnel/networking.md
.cursor/skills/cloudflare/references/tunnel/patterns.md
.cursor/skills/cloudflare/references/turn/README.md
.cursor/skills/cloudflare/references/turn/api.md
.cursor/skills/cloudflare/references/turn/configuration.md
.cursor/skills/cloudflare/references/turn/gotchas.md
.cursor/skills/cloudflare/references/turn/patterns.md
.cursor/skills/cloudflare/references/turnstile/README.md
.cursor/skills/cloudflare/references/turnstile/api.md
.cursor/skills/cloudflare/references/turnstile/configuration.md
.cursor/skills/cloudflare/references/turnstile/gotchas.md
.cursor/skills/cloudflare/references/turnstile/patterns.md
.cursor/skills/cloudflare/references/vectorize/README.md
.cursor/skills/cloudflare/references/vectorize/api.md
.cursor/skills/cloudflare/references/vectorize/configuration.md
.cursor/skills/cloudflare/references/vectorize/gotchas.md
.cursor/skills/cloudflare/references/vectorize/patterns.md
.cursor/skills/cloudflare/references/waf/README.md
.cursor/skills/cloudflare/references/waf/api.md
.cursor/skills/cloudflare/references/waf/configuration.md
.cursor/skills/cloudflare/references/waf/gotchas.md
.cursor/skills/cloudflare/references/waf/patterns.md
.cursor/skills/cloudflare/references/web-analytics/README.md
.cursor/skills/cloudflare/references/web-analytics/configuration.md
.cursor/skills/cloudflare/references/web-analytics/gotchas.md
.cursor/skills/cloudflare/references/web-analytics/integration.md
.cursor/skills/cloudflare/references/web-analytics/patterns.md
.cursor/skills/cloudflare/references/workerd/README.md
.cursor/skills/cloudflare/references/workerd/api.md
.cursor/skills/cloudflare/references/workerd/configuration.md
.cursor/skills/cloudflare/references/workerd/gotchas.md
.cursor/skills/cloudflare/references/workerd/patterns.md
.cursor/skills/cloudflare/references/workers-ai/README.md
.cursor/skills/cloudflare/references/workers-ai/api.md
.cursor/skills/cloudflare/references/workers-ai/configuration.md
.cursor/skills/cloudflare/references/workers-ai/gotchas.md
.cursor/skills/cloudflare/references/workers-ai/patterns.md
.cursor/skills/cloudflare/references/workers-for-platforms/README.md
.cursor/skills/cloudflare/references/workers-for-platforms/api.md
.cursor/skills/cloudflare/references/workers-for-platforms/configuration.md
.cursor/skills/cloudflare/references/workers-for-platforms/gotchas.md
.cursor/skills/cloudflare/references/workers-for-platforms/patterns.md
.cursor/skills/cloudflare/references/workers-playground/README.md
.cursor/skills/cloudflare/references/workers-playground/api.md
.cursor/skills/cloudflare/references/workers-playground/configuration.md
.cursor/skills/cloudflare/references/workers-playground/gotchas.md
.cursor/skills/cloudflare/references/workers-playground/patterns.md
.cursor/skills/cloudflare/references/workers-vpc/README.md
.cursor/skills/cloudflare/references/workers-vpc/api.md
.cursor/skills/cloudflare/references/workers-vpc/configuration.md
.cursor/skills/cloudflare/references/workers-vpc/gotchas.md
.cursor/skills/cloudflare/references/workers-vpc/patterns.md
.cursor/skills/cloudflare/references/workers/README.md
.cursor/skills/cloudflare/references/workers/api.md
.cursor/skills/cloudflare/references/workers/configuration.md
.cursor/skills/cloudflare/references/workers/frameworks.md
.cursor/skills/cloudflare/references/workers/gotchas.md
.cursor/skills/cloudflare/references/workers/patterns.md
.cursor/skills/cloudflare/references/workflows/README.md
.cursor/skills/cloudflare/references/workflows/api.md
.cursor/skills/cloudflare/references/workflows/configuration.md
.cursor/skills/cloudflare/references/workflows/gotchas.md
.cursor/skills/cloudflare/references/workflows/patterns.md
.cursor/skills/cloudflare/references/wrangler/README.md
.cursor/skills/cloudflare/references/wrangler/api.md
.cursor/skills/cloudflare/references/wrangler/configuration.md
.cursor/skills/cloudflare/references/wrangler/gotchas.md
.cursor/skills/cloudflare/references/wrangler/patterns.md
.cursor/skills/cloudflare/references/zaraz/IMPLEMENTATION_SUMMARY.md
.cursor/skills/cloudflare/references/zaraz/README.md
.cursor/skills/cloudflare/references/zaraz/api.md
.cursor/skills/cloudflare/references/zaraz/configuration.md
.cursor/skills/cloudflare/references/zaraz/gotchas.md
.cursor/skills/cloudflare/references/zaraz/patterns.md
.cursor/skills/durable-objects/SKILL.md
.cursor/skills/durable-objects/references/rules.md
.cursor/skills/durable-objects/references/testing.md
.cursor/skills/durable-objects/references/workers.md
.cursor/skills/fnf-cloudflare-runtime/SKILL.md
.cursor/skills/stripe-best-practices/SKILL.md
.cursor/skills/stripe-best-practices/references/billing.md
.cursor/skills/stripe-best-practices/references/connect.md
.cursor/skills/stripe-best-practices/references/payments.md
.cursor/skills/stripe-best-practices/references/security.md
.cursor/skills/stripe-best-practices/references/tax.md
.cursor/skills/stripe-best-practices/references/treasury.md
.cursor/skills/stripe-directory/SKILL.md
.cursor/skills/stripe-projects/SKILL.md
.cursor/skills/upgrade-stripe/SKILL.md
.cursor/skills/web-perf/SKILL.md
.cursor/skills/workers-best-practices/SKILL.md
.cursor/skills/workers-best-practices/references/review.md
.cursor/skills/workers-best-practices/references/rules.md
.cursor/skills/wrangler/SKILL.md
.env.cloudflare.example
.gitignore
AGENTS.md
AGENTSAM.md
README.md
SECRETS.md
admin-ui/.gitignore
admin-ui/README.md
admin-ui/SOURCE_MAP.md
admin-ui/eslint.config.js
admin-ui/index.html
admin-ui/package-lock.json
admin-ui/package.json
admin-ui/public/favicon.svg
admin-ui/public/icons.svg
admin-ui/src/App.css
admin-ui/src/App.tsx
admin-ui/src/assets/hero.png
admin-ui/src/assets/react.svg
admin-ui/src/assets/vite.svg
admin-ui/src/components/analytics-ui.tsx
admin-ui/src/index.css
admin-ui/src/layout/AdminLayout.tsx
admin-ui/src/lib/api.ts
admin-ui/src/lib/format.ts
admin-ui/src/lib/types.ts
admin-ui/src/main.tsx
admin-ui/src/pages/account/AccountPage.tsx
admin-ui/src/pages/analytics/AnalyticsShell.tsx
admin-ui/src/pages/analytics/FinancePage.tsx
admin-ui/src/pages/analytics/HealthPage.tsx
admin-ui/src/pages/analytics/OverviewPage.tsx
admin-ui/src/styles/analytics-shell.css
admin-ui/src/styles/analytics.css
admin-ui/tsconfig.app.json
admin-ui/tsconfig.json
admin-ui/tsconfig.node.json
admin-ui/vite.config.ts
analytics-3pt-dashboard-buildin.html
app/backend/admin/agentsam.js
app/backend/agentsam/ai-registry.js
app/backend/agentsam/ai-run.js
app/backend/agentsam/analytics.js
app/backend/agentsam/attachments.js
app/backend/agentsam/compaction.js
app/backend/agentsam/constants.js
app/backend/agentsam/context-cache.js
app/backend/agentsam/conversations.js
app/backend/agentsam/feature-gates.js
app/backend/agentsam/files.js
app/backend/agentsam/fnf-vectorize.js
app/backend/agentsam/github-client.js
app/backend/agentsam/mcp-client.js
app/backend/agentsam/mcp-servers.js
app/backend/agentsam/prompt-cache.js
app/backend/agentsam/prompt-registry.js
app/backend/agentsam/quick-actions.js
app/backend/agentsam/router.js
app/backend/agentsam/skill-r2.js
app/backend/agentsam/skills.js
app/backend/agentsam/threads.js
app/backend/agentsam/tool-handlers.js
app/backend/agentsam/tool-traces.js
app/backend/agentsam/tools-registry.js
app/backend/agentsam/webhook-events.js
app/backend/lib/auth.js
app/frontend/admin/agentsam/agentsam-page.css
app/frontend/admin/agentsam/agentsam-page.js
app/frontend/admin/agentsam/agentsam.html
db/migrate-admin-github-oauth.sql
db/migrate-agentsam-ai.sql
db/migrate-agentsam-analytics.sql
db/migrate-agentsam-attachments.sql
db/migrate-agentsam-compaction.sql
db/migrate-agentsam-conversations.sql
db/migrate-agentsam-platform.sql
db/migrate-agentsam-project-context.sql
db/migrate-agentsam-prompts.sql
db/migrate-agentsam-skill-revisions.sql
db/migrate-agentsam-skills.sql
db/migrate-agentsam-tools.sql
db/migrate-agentsam-workflows-v2.sql
db/migrate-agentsam-workflows.sql
db/migrate-attribution.sql
db/migrate-auth-users-finalize.sql
db/migrate-auth-users-slim.sql
db/migrate-auth-users.sql
db/migrate-cms-r2.sql
db/migrate-completeful.sql
db/migrate-discounts.sql
db/migrate-growth-campaigns.sql
db/migrate-mail-inbox.sql
db/migrate-mail-mailboxes-v2.sql
db/migrate-mail-mailboxes.sql
db/migrate-media-library.sql
db/migrate-media-placement.sql
db/migrate-stripe.sql
db/patch-agentsam-disable-research-tools.sql
db/patch-agentsam-prompts-feature-gates.sql
db/patch-agentsam-skills-sync-invalidate.sql
db/patch-agentsam-tools-fnf-scope.sql
db/schema.sql
db/seed-agentsam-ai.sql
db/seed-agentsam-fnf-hooks-webhooks-v2.sql
db/seed-agentsam-models.sql
db/seed-agentsam-platform.sql
db/seed-agentsam-prompts.sql
db/seed-agentsam-skills.sql
db/seed-agentsam-tools-vectorize.sql
db/seed-agentsam-tools.sql
db/seed-agentsam-workflow-nodes-studio.sql
db/seed-agentsam-workflows-studio.sql
db/seed-agentsam-workflows.sql
db/seed-auth-display-names.sql
db/seed-cms-full.sql
db/seed-cms.sql
db/seed-ctx-fuelnfreetime-iam.sql
db/seed-ctx-fuelnfreetime-worker.sql
db/seed-dev-session-2026-06-21.sql
db/seed-mail-mailboxes.sql
db/seed-platform.sql
db/seed-tee.sql
design/admin-console/Admin Console.dc.html
design/admin-console/README.md
design/admin-console/support.js
design/admin-console/uploads/Screenshot 2026-06-20 at 9.04.42 am.png
design/admin-console/uploads/Screenshot 2026-06-20 at 9.04.56 am.png
docs/AGENTSAM-COMPACTION.md
docs/AGENTSAM-FEATURE-GATES.md
docs/AGENTSAM-GITHUB.md
docs/AGENTSAM-PROMPT-SYSTEM.md
docs/AGENTSAM-SKILLS.md
docs/FNF-CMS-SPRINT-2026-06-20.md
docs/FNF-RUNTIME-OPS-2026-06-21.md
docs/RUNTIME-CONTRACTS-AGENTSAM.md
docs/RUNTIME-CONTRACTS-COMMERCE.md
docs/RUNTIME-CONTRACTS-COMPLETEFUL.md
docs/RUNTIME-CONTRACTS-STRIPE.md
docs/admin-platform-template-plan.md
docs/brand/Fuel_and_Free_Time_Business_Brand_Dossier.docx
docs/brand/business-brand-dossier.md
docs/cms-deploy-hooks.md
docs/providers/completeful/README.md
docs/providers/completeful/openapi.json
docs/providers/completeful/openapi.snapshot.md
docs/providers/completeful/reference.snapshot.md
legacy/README.md
legacy/about.html
legacy/community.html
legacy/index.html
legacy/shop.html
package-lock.json
package.json
public/about.html
public/admin/_spa/assets/index-9GQUwQVz.css
public/admin/_spa/assets/index-Bevxc34_.js
public/admin/_spa/assets/index-Bevxc34_.js.map
public/admin/_spa/favicon.svg
public/admin/_spa/icons.svg
public/admin/_spa/index.html
public/admin/account.html
public/admin/analytics/analytics-shell.css
public/admin/analytics/analytics.css
public/admin/analytics/assets/0776a419-ddeb-45e7-be18-d5f8cd76da9e.js
public/admin/analytics/assets/111a6d5a-856b-4c9b-bfea-2d42462e1948.js
public/admin/analytics/assets/244140b3-93ba-47fa-9cc6-257337755d4e.woff2
public/admin/analytics/assets/25fb0ba9-fcb0-4f95-908c-022294da338c.woff2
public/admin/analytics/assets/27bec9b0-34ca-4c3b-a9bb-8a5e7e9040db.woff2
public/admin/analytics/assets/2e781dd1-1171-40b6-89aa-534f57a771fc.woff2
public/admin/analytics/assets/3d7adce5-05a3-4b4e-b5fc-ffa9c285f87c.woff2
public/admin/analytics/assets/40428855-2474-46c4-8c72-29dc788e98e5.woff2
public/admin/analytics/assets/8304895d-d55a-46ad-a3a8-af53194d4423.woff2
public/admin/analytics/assets/86f69386-4f84-40a8-b358-29ff5c28b76c.woff2
public/admin/analytics/assets/94426871-cf24-4578-8b4f-3e12b3ad6363.woff2
public/admin/analytics/assets/98b26e01-8bb8-4a43-b3db-55326925c916.js
public/admin/analytics/assets/ab9573c2-3cbc-4053-bf19-beb07f32cfaa.js
public/admin/analytics/assets/ac0bb828-1140-4564-87b0-6da752887759.woff2
public/admin/analytics/assets/b3ebf5b6-3b36-4355-9055-bf46b687ff8a.js
public/admin/analytics/assets/bd69ac09-5087-41a1-9f85-73b30655b43f.woff2
public/admin/analytics/assets/cc20c761-d717-4df3-aafd-03c0be627412.js
public/admin/analytics/assets/cfca5d09-e5b1-4ccd-abe2-a2a0c1bea115.woff2
public/admin/analytics/assets/d4b5f3b1-05df-4f31-b16a-95fc47c9dc8b.woff2
public/admin/analytics/assets/d4bbf6c3-a1e4-4426-90c2-e4cc9bdc562a.js
public/admin/analytics/assets/e6f8636f-e68b-40d3-aff3-a0e72e3b2a4d.js
public/admin/analytics/embed.html
public/admin/analytics/finance.html
public/admin/analytics/health.html
public/admin/analytics/overview.html
public/admin/content.html
public/admin/css/account-mail.css
public/admin/css/admin.css
public/admin/css/agentsam.css
public/admin/css/console.css
public/admin/css/discounts.css
public/admin/css/growth.css
public/admin/css/mail.css
public/admin/css/media-library.css
public/admin/css/media-picker.css
public/admin/css/pages.css
public/admin/css/preferences.css
public/admin/css/product-edit.css
public/admin/dashboard.html
public/admin/dashboard/analytics.html
public/admin/dashboard/email.html
public/admin/dashboard/finance.html
public/admin/dashboard/overview.html
public/admin/discounts.html
public/admin/growth.html
public/admin/home.html
public/admin/inventory.html
public/admin/js/account-settings.js
public/admin/js/agentsam.js
public/admin/js/analytics-boot.js
public/admin/js/cms-live.js
public/admin/js/discounts.js
public/admin/js/growth.js
public/admin/js/mail.js
public/admin/js/media-library.js
public/admin/js/media-picker.js
public/admin/js/pages-shared.js
public/admin/js/shell.js
public/admin/login.html
public/admin/media.html
public/admin/orders.html
public/admin/page-edit.html
public/admin/pages.html
public/admin/partials/discounts-app.html
public/admin/partials/growth-app.html
public/admin/partials/mail-app.html
public/admin/preferences.html
public/admin/product-edit.html
public/admin/products.html
public/admin/scaffold.html
public/admin/store.html
public/admin/subscribers.html
public/admin/theme-editor.html
public/cart.html
public/community.html
public/css/shop-hero.css
public/css/store-cart.css
public/css/store-pdp.css
public/css/store-shell.css
public/index.html
public/js/cms-hydrate.js
public/js/fnf-attribution.js
public/js/fnf-head.js
public/js/fnf-newsletter.js
public/js/order-confirmation.js
public/js/shop-hero.js
public/js/store-cart.js
public/js/store-catalog.js
public/js/store-product.js
public/js/store-shell.js
public/order-confirmation.html
public/product.html
public/shop.html
scripts/agentsam-compact.mjs
scripts/agentsam-rollup.mjs
scripts/apply-agentsam-workflow-nodes-table.sh
scripts/apply-agentsam-workflows-v2.sh
scripts/backfill-inbound-mail.mjs
scripts/cf-builds-deploy.sh
scripts/cf-builds-sync.sh
scripts/cf-status.mjs
scripts/check-dns.mjs
scripts/cms-deploy-hook.mjs
scripts/cms-post-deploy.mjs
scripts/create-admin.mjs
scripts/embed-fnf-content.mjs
scripts/embed-mail-template.mjs
scripts/generate-cms-seed.mjs
scripts/hydrate-inbound-bodies.mjs
scripts/install-cloudflare-skills.mjs
scripts/port-analytics-pages.mjs
scripts/provision-mailboxes.mjs
scripts/r2-cors.json
scripts/republish-cms-kv.mjs
scripts/send-mail-e2e.mjs
scripts/set-resend-secrets.sh
scripts/setup-resend-dns.mjs
scripts/sync-agentsam-skills.mjs
scripts/sync-app-frontend.mjs
scripts/unpack-analytics.mjs
scripts/warm-cms-cache.mjs
scripts/with-cf-admin-env.sh
src/admin/agentsam-github.js
src/admin/agentsam.js
src/admin/analytics-finance.js
src/admin/api.js
src/admin/completeful.js
src/admin/discounts.js
src/admin/growth.js
src/admin/mail.js
src/admin/media.js
src/admin/store.js
src/admin/team.js
src/agentsam/ai-registry.js
src/agentsam/ai-run.js
src/agentsam/analytics.js
src/agentsam/attachments.js
src/agentsam/compaction.js
src/agentsam/constants.js
src/agentsam/context-cache.js
src/agentsam/conversations.js
src/agentsam/feature-gates.js
src/agentsam/files.js
src/agentsam/fnf-vectorize.js
src/agentsam/github-client.js
src/agentsam/mcp-client.js
src/agentsam/mcp-servers.js
src/agentsam/prompt-cache.js
src/agentsam/prompt-registry.js
src/agentsam/quick-actions.js
src/agentsam/router.js
src/agentsam/skill-r2.js
src/agentsam/skills.js
src/agentsam/threads.js
src/agentsam/tool-handlers.js
src/agentsam/tool-traces.js
src/agentsam/tools-registry.js
src/agentsam/webhook-events.js
src/attribution/api.js
src/cms/api.js
src/cms/deploy.js
src/cms/edge-hydrate.js
src/cms/html-rewriter.js
src/cms/media-paths.js
src/cms/r2-store.js
src/cms/registry.js
src/cms/stubs.js
src/completeful/catalog.js
src/completeful/client.js
src/do/CmsEditorRoom.js
src/index.js
src/lib/admin-routes.js
src/lib/attribution.js
src/lib/auth.js
src/lib/discounts.js
src/lib/mail-mailboxes.js
src/lib/resend.js
src/lib/routes.js
src/lib/site-nav.js
src/store/api.js
src/store/inventory.js
src/store/order-email.js
src/store/stripe-webhook.js
src/store/stripe.js
src/webhooks/completeful.js
src/webhooks/resend.js
wrangler.toml
```

---

## Target tree — `apps/ecommerce-cms-agentsam/` (inside `fuelnfreetime`)

Naming follows the precedent you already set with the `AccountPage.tsx`
marker: folder names are **kept as-is**, just relocated under
`apps/ecommerce-cms-agentsam/` — no `admin-ui` → `frontend` rename, no
`src` → `worker` rename. Minimum-diff move, maximum future compatibility
with copying this straight into `agentsam-sdk/apps/` later.

```
apps/ecommerce-cms-agentsam/
├── agentsam.app.json            # NEW — app manifest (id, capabilities, commands),
│                                 #   matching the sibling-app convention already used
│                                 #   by cad-creator/client-cms-editor in agentsam-sdk
├── IMPORT_PROVENANCE.json       # NEW — correct provenance: this app *is* fuelnfreetime,
│                                 #   not a donor-seed remix (see prior correction)
├── bin/
│   └── agentsam-ecommerce.mjs   # NEW — CLI entry (preview/info/doctor/scaffold),
│                                 #   matching sibling-app convention
├── admin-ui/                    # MOVED as-is — React/Vite admin SPA
│   └── src/
│       ├── pages/
│       │   ├── account/AccountPage.tsx      # ported this session
│       │   ├── analytics/*                  # already ported
│       │   ├── orders/          # TODO
│       │   ├── products/        # TODO
│       │   ├── content/         # TODO
│       │   ├── growth/          # TODO
│       │   ├── discounts/       # TODO
│       │   ├── store/           # TODO
│       │   ├── preferences/     # TODO
│       │   └── agentsam/        # TODO — biggest one, has its own backend already
│       ├── layout/AdminLayout.tsx
│       └── lib/{api.ts,types.ts}
├── app/                         # MOVED as-is — AgentSam canonical source
│   ├── backend/agentsam/
│   └── frontend/admin/agentsam/
├── src/                         # MOVED as-is — Worker backend (main = src/index.js)
│   ├── admin/
│   ├── agentsam/
│   ├── cms/
│   ├── completeful/
│   ├── store/
│   ├── webhooks/
│   ├── lib/
│   │   └── admin-routes.js      # ADMIN_CLEAN_PAGES shrinks as pages get ported
│   └── index.js
├── db/                          # MOVED as-is — schema.sql + migrate-*/seed-*/patch-*
├── public/                      # MOVED as-is — storefront + remaining legacy admin HTML
│   └── admin/
│       ├── *.html               # shrinks as each page ports to admin-ui/
│       └── js/                  # shrinks as each page ports (shell.js survives longest —
│                                 #   still owns global topbar/sidenav chrome for whatever's
│                                 #   still legacy)
├── docs/                        # MOVED as-is — RUNTIME-CONTRACTS-*, AGENTSAM-*, brand/
├── scripts/                     # MOVED as-is — deploy, cms warm/republish, agentsam skills
├── legacy/                      # MOVED as-is — pre-CMS static pages
├── design/                      # MOVED as-is
├── AGENTS.md / AGENTSAM.md / README.md / SECRETS.md   # MOVED as-is
├── wrangler.toml                # MOVED as-is (main = src/index.js, [assets] dir = ./public
│                                 #   — both stay correct since internal layout is unchanged)
└── package.json / package-lock.json   # MOVED as-is
```

**What stays at the fuelnfreetime repo root** (nothing, in the end-state —
everything currently at root moves under `apps/ecommerce-cms-agentsam/`,
matching what you already started with the AccountPage marker).

---

## Path mapping (old → new)

| Current path | Target path |
|---|---|
| `admin-ui/` | `apps/ecommerce-cms-agentsam/admin-ui/` |
| `src/` | `apps/ecommerce-cms-agentsam/src/` |
| `public/` | `apps/ecommerce-cms-agentsam/public/` |
| `db/` | `apps/ecommerce-cms-agentsam/db/` |
| `docs/` | `apps/ecommerce-cms-agentsam/docs/` |
| `scripts/` | `apps/ecommerce-cms-agentsam/scripts/` |
| `app/` | `apps/ecommerce-cms-agentsam/app/` |
| `legacy/`, `design/` | same, under the new root |
| `wrangler.toml`, `package.json` | same, under the new root |
| *(none — new)* | `apps/ecommerce-cms-agentsam/agentsam.app.json` |
| *(none — new)* | `apps/ecommerce-cms-agentsam/IMPORT_PROVENANCE.json` |
| *(none — new)* | `apps/ecommerce-cms-agentsam/bin/agentsam-ecommerce.mjs` |

---

## The move itself

Everything above is a **plan**, not yet executed. The physical move is one
`git mv` of the whole current root into `apps/ecommerce-cms-agentsam/`,
which is safe and reversible in git — the one external dependency it breaks
is Cloudflare Workers Builds' "Root directory" setting (currently `/`),
which has to be flipped to `apps/ecommerce-cms-agentsam` in the CF dashboard
in the same window as the push, or the next auto-deploy fails to find
`package.json`. That's the one moment of real risk on a live site, and it's
worth doing as its own dedicated pass — not bundled into an unrelated page
port — so a bad deploy is trivial to isolate and roll back.

Until that move happens, keep building new pages at their **target** path
(`apps/ecommerce-cms-agentsam/admin-ui/src/pages/...`) as placeholders/specs,
the way the AccountPage marker was used, OR at the current root path if you
want it live immediately — just say which each time, since they're not
interchangeable until the move lands.
