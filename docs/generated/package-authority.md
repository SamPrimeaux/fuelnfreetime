# Generated package authority inventory

> Generated from current FNF manifests and tracked runtime references by `scripts/package-authority.mjs`. Edit `docs/package-authority.json` or manifests, then run `node scripts/package-authority.mjs --write`.
> Audit snapshot: 2026-10-08. SDK rows are a separately checked source snapshot, not a live cross-repo or deployment verification.

## Local FNF workspace packages

ACTIVE REFERENCE means a source/bundle reference exists, **not** a deployed integration or feature parity proof.

| Package | Workspace | Version | Manifest | Observed reference | Role | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| `@inneranimalmedia/admin-dock` | [packages/admin-dock](../../packages/admin-dock) | `0.1.0` | publishable manifest | ACTIVE REFERENCE | Reusable responsive admin dock | [scripts/sync-app-frontend.mjs](../../scripts/sync-app-frontend.mjs) |
| `@inneranimalmedia/admin-profile-popup` | [packages/admin-profile-popup](../../packages/admin-profile-popup) | `0.1.0` | publishable manifest | ACTIVE REFERENCE | Reusable account/profile presentation | [scripts/sync-app-frontend.mjs](../../scripts/sync-app-frontend.mjs) |
| `@inneranimalmedia/agentsam-merch` | [packages/agentsam-merch](../../packages/agentsam-merch) | `0.1.0` | publishable manifest | ACTIVE REFERENCE | Product/manufacturing preparation and product spine | [apps/ecommerce-cms-agentsam/backend/admin/api.js](../../apps/ecommerce-cms-agentsam/backend/admin/api.js), [apps/ecommerce-cms-agentsam/frontend/src/pages/products/StudioWorkspace.tsx](../../apps/ecommerce-cms-agentsam/frontend/src/pages/products/StudioWorkspace.tsx) |
| `@inneranimalmedia/agentsam-workbench` | [packages/agentsam-workbench](../../packages/agentsam-workbench) | `0.1.0` | publishable manifest | ACTIVE REFERENCE | Composer/miniAgentSam interaction (FNF workspace copy) | [apps/ecommerce-cms-agentsam/frontend/inspector.js](../../apps/ecommerce-cms-agentsam/frontend/inspector.js), [apps/ecommerce-cms-agentsam/frontend/static/js/agentsam-page.js](../../apps/ecommerce-cms-agentsam/frontend/static/js/agentsam-page.js), [apps/ecommerce-cms-agentsam/frontend/static/js/media-library.js](../../apps/ecommerce-cms-agentsam/frontend/static/js/media-library.js), [apps/ecommerce-cms-agentsam/frontend/static/js/theme-editor-mini-agentsam.mjs](../../apps/ecommerce-cms-agentsam/frontend/static/js/theme-editor-mini-agentsam.mjs) |
| `@inneranimalmedia/commerce-analytics` | [packages/commerce-analytics](../../packages/commerce-analytics) | `0.1.0` | publishable manifest | ACTIVE REFERENCE | Commerce analytics presentation | [apps/ecommerce-cms-agentsam/backend/admin/analytics-live-logs.js](../../apps/ecommerce-cms-agentsam/backend/admin/analytics-live-logs.js), [apps/ecommerce-cms-agentsam/frontend/src/pages/analytics/AnalyticsShell.tsx](../../apps/ecommerce-cms-agentsam/frontend/src/pages/analytics/AnalyticsShell.tsx), [apps/ecommerce-cms-agentsam/frontend/src/pages/analytics/FinancePage.tsx](../../apps/ecommerce-cms-agentsam/frontend/src/pages/analytics/FinancePage.tsx), [apps/ecommerce-cms-agentsam/frontend/src/pages/analytics/HealthPage.tsx](../../apps/ecommerce-cms-agentsam/frontend/src/pages/analytics/HealthPage.tsx) |
| `@inneranimalmedia/ecommerce-cms-agentsam` | [apps/ecommerce-cms-agentsam](../../apps/ecommerce-cms-agentsam) | `0.2.0` | private | APPLICATION | Ecommerce/CMS application composition and merchant install | [apps/ecommerce-cms-agentsam/package.json](../../apps/ecommerce-cms-agentsam/package.json) |
| `@inneranimalmedia/fnf-theme` | [packages/fnf-theme](../../packages/fnf-theme) | `0.1.0` | publishable manifest | ACTIVE REFERENCE | FNF merchant theme configuration/presentation | [scripts/sync-app-frontend.mjs](../../scripts/sync-app-frontend.mjs) |
| `@inneranimalmedia/heuristic-theme` | [packages/heuristic-theme](../../packages/heuristic-theme) | `0.1.0` | private | ACTIVE REFERENCE | Current storefront theme/runtime | [apps/ecommerce-cms-agentsam/backend/admin/store.js](../../apps/ecommerce-cms-agentsam/backend/admin/store.js), [scripts/sync-app-frontend.mjs](../../scripts/sync-app-frontend.mjs) |
| `@inneranimalmedia/media-kit` | [packages/media-kit](../../packages/media-kit) | `0.1.0` | publishable manifest | ACTIVE REFERENCE | Media collection and provider-neutral UI contracts | [apps/ecommerce-cms-agentsam/backend/media/collection-contract.js](../../apps/ecommerce-cms-agentsam/backend/media/collection-contract.js), [apps/ecommerce-cms-agentsam/backend/media/provider-contract.js](../../apps/ecommerce-cms-agentsam/backend/media/provider-contract.js), [apps/ecommerce-cms-agentsam/frontend/static/js/media-library.js](../../apps/ecommerce-cms-agentsam/frontend/static/js/media-library.js), [scripts/sync-app-frontend.mjs](../../scripts/sync-app-frontend.mjs) |
| `@inneranimalmedia/theme-contract` | [packages/theme-contract](../../packages/theme-contract) | `0.1.0` | private | ACTIVE REFERENCE | Portable section/theme/runtime contracts | [apps/ecommerce-cms-agentsam/backend/cms/api.js](../../apps/ecommerce-cms-agentsam/backend/cms/api.js), [scripts/sync-app-frontend.mjs](../../scripts/sync-app-frontend.mjs) |

## Canonical SDK authority targets

CONVERGING = upstream implementation exists, but FNF delegation/parity is not established. AVAILABLE = upstream source found; no FNF integration claimed. SOURCE_UNVERIFIED = source location was not confirmed.

| Package | SDK path | Audited version | Status | Authority |
| --- | --- | --- | --- | --- |
| `@inneranimalmedia/agentsam-assets-core` | `agentsam-sdk/packages/agentsam-assets-core` | `2.6.12` | CONVERGING | Asset identity, provenance, derivative identities |
| `@inneranimalmedia/agentsam-content` | `agentsam-sdk/packages/agentsam-content` | `2.6.12` | CONVERGING | Content lifecycle and provider representations |
| `@inneranimalmedia/agentsam-content-studio` | `agentsam-sdk/packages/agentsam-content-studio` | `2.6.12` | CONVERGING | Content/library UI |
| `@inneranimalmedia/agentsam-cloudflare-images` | `agentsam-sdk/packages/agentsam-cloudflare-images` | `2.6.12` | CONVERGING | Cloudflare Images provider/delivery |
| `@inneranimalmedia/agentsam-knowledge` | `agentsam-sdk/packages/agentsam-knowledge` | `2.6.12` | CONVERGING | AutoRAG, embedding/index/retrieve adapters |
| `@inneranimalmedia/agentsam-connector-cloudflare` | `agentsam-sdk/packages/connectors/cfoa` | `2.6.12` | CONVERGING | Cloudflare OAuth and Vectorize/R2 provider operations |
| `@inneranimalmedia/agentsam-settings` | `agentsam-sdk/packages/agentsam-settings` | `2.6.12` | CONVERGING | Settings, integrations, skills/MCP catalog views |
| `@inneranimalmedia/agentsam-vault` | `agentsam-sdk/packages/agentsam-vault` | `2.6.12` | CONVERGING | Encrypted credential authority |
| `@inneranimalmedia/agentsam-key-manager` | `agentsam-sdk/packages/agentsam-key-manager` | `2.6.12` | CONVERGING | Credential/connection UI |
| `@inneranimalmedia/agentsam-identity` | `agentsam-sdk/packages/identity` | `2.6.12` | CONVERGING | Identity/session/OAuth entry |
| `@inneranimalmedia/agentsam-hooks` | `agentsam-sdk/packages/agentsam-hooks` | `2.6.12` | CONVERGING | Hook/MCP execution adapters |
| `@inneranimalmedia/agentsam-contracts` | `agentsam-sdk/packages/agentsam-contracts` | `2.6.12` | CONVERGING | Cross-product execution/contracts |
| `@inneranimalmedia/agentsam-repository` | `agentsam-sdk/packages/agentsam-repository` | `2.6.12` | CONVERGING | Canonical repository identity, contract records/hashes, dependency edges, failure policy, Git context, Merkle persistence and graph normalization. FNF package inventory remains an evidence consumer, not a new repository graph authority. — Upstream README advises SDK facade for cross-repo use until standalone release policy stabilizes; package.json now declares publishable. Verify release/exports before direct dependency. |
| `@inneranimalmedia/agentsam-errors` | `agentsam-sdk/packages/agentsam-errors` | `2.6.12` | AVAILABLE | Canonical error/remediation contracts |
| `@inneranimalmedia/agentsam-brand` | `agentsam-sdk/packages/agentsam-brand` | `2.6.12` | AVAILABLE | Brand tooling |
| `@inneranimalmedia/agentsam-campaign` | `agentsam-sdk/packages/agentsam-campaign` | `2.6.12` | AVAILABLE | Campaign/SEO intelligence |
| `@inneranimalmedia/agentsam-analytics` | `agentsam-sdk/packages/agentsam-analytics` | `2.6.12` | AVAILABLE | Analytics read models |
| `@inneranimalmedia/cms-runtime` | `agentsam-sdk/packages/cms-runtime` | `2.6.12` | CONVERGING | CMS manifest, database and runtime contracts |
| `@inneranimalmedia/client-cms-editor` | `agentsam-sdk/apps/client-cms-editor` | `2.6.12` | CONVERGING | Reusable CMS editor UI |
| `@inneranimalmedia/agentsam-browser-surface` | `agentsam-sdk/packages/agentsam-browser-surface` | `2.6.12` | AVAILABLE | Browser surface contract |
| `@inneranimalmedia/agentsam-abs` | `agentsam-sdk/packages/agentsam-abs` | `2.6.12` | AVAILABLE | AgentSam Browser Shell product |
| `@inneranimalmedia/agentsam-provider-completeful` | `agentsam-sdk/packages/providers/completeful` | `2.6.12` | CONVERGING | Completeful provider adapter |
| `@inneranimalmedia/revise-theme` | source unverified | — | SOURCE_UNVERIFIED | Alternate packaged theme — Declared/referenced by ecommerce; source package not verified in inspected agentsam-sdk checkout. Resolve before claiming active or canonical. |
| `@inneranimalmedia/section-library` | source unverified | — | SOURCE_UNVERIFIED | Reusable section primitives — Declared/referenced by ecommerce; source package not verified in inspected agentsam-sdk checkout. Resolve before claiming active or canonical. |
| `@inneranimalmedia/site-contracts` | source unverified | — | SOURCE_UNVERIFIED | Site/layout contracts — Declared/referenced by ecommerce; source package not verified in inspected agentsam-sdk checkout. Resolve before claiming active or canonical. |
| `@inneranimalmedia/agentsam-merch` | `agentsam-sdk/packages/agentsam-merch` | `2.6.12` | CONVERGING | Upstream product/manufacturing authority; overlaps FNF local same name |
| `@inneranimalmedia/agentsam-workbench` | `agentsam-sdk/packages/agentsam-workbench` | `2.6.12` | CONVERGING | Upstream composer/run-mode authority; overlaps FNF local same name |

## Same-name FNF/SDK packages

- `@inneranimalmedia/agentsam-merch`: local `0.1.0` and separately audited SDK `2.6.12`. Resolve import/bundle authority explicitly; a same-name package is not automatically the same implementation.
- `@inneranimalmedia/agentsam-workbench`: local `0.1.0` and separately audited SDK `2.6.12`. Resolve import/bundle authority explicitly; a same-name package is not automatically the same implementation.

## Existing operators and compatibility paths

| Entrypoint | Status | Next action / boundary |
| --- | --- | --- |
| [bin/fnf-assets.mjs](../../bin/fnf-assets.mjs) | ACTIVE OPERATOR TOOL | Production asset queue/pipeline via lib/assets; preserve CLI alias |
| [lib/assets/process-job.js](../../lib/assets/process-job.js) | ACTIVE IMPLEMENTATION | Queue processing, retries, media finalization; parity gate before relocation |
| [lib/assets/worker-hook.js](../../lib/assets/worker-hook.js) | ACTIVE IMPLEMENTATION | Worker queue intake and error/recovery |
| [apps/ecommerce-cms-agentsam/backend/assets/product-optimize.js](../../apps/ecommerce-cms-agentsam/backend/assets/product-optimize.js) | COMPATIBILITY ADAPTER | Worker-facing asset job/optimization path |
| [scripts/optimize-uploads-images.mjs](../../scripts/optimize-uploads-images.mjs) | COMPATIBILITY WRAPPER | Already delegates to bin/fnf-assets.mjs optimize; NOT a second optimizer |
| [scripts/embed-fnf-content.mjs](../../scripts/embed-fnf-content.mjs) | ACTIVE OPERATOR TOOL | Local indexing orchestration; converge on Knowledge runtime only after parity |
| [apps/ecommerce-cms-agentsam/backend/agentsam/vectorize-adapter.js](../../apps/ecommerce-cms-agentsam/backend/agentsam/vectorize-adapter.js) | CONVERGING IMPLEMENTATION | Already generic/config-driven but implemented locally; compare against SDK backend |
| [apps/ecommerce-cms-agentsam/backend/agentsam/fnf-vectorize.js](../../apps/ecommerce-cms-agentsam/backend/agentsam/fnf-vectorize.js) | MERCHANT ADAPTER / CONVERGING | FNF Workers AI, index, scope and result formatting; strip generic logic after parity |
| [apps/ecommerce-cms-agentsam/bin/ecommerce.mjs](../../apps/ecommerce-cms-agentsam/bin/ecommerce.mjs) | ACTIVE OPERATOR TOOL | Portable ecommerce info/doctor/preview/scaffold |

## Verification limitations

- FNF roles, files, versions and app references are checked against THIS checkout. A package presence or import is not a deployment readiness result.
- SDK source paths and versions came from a separate checked SDK workspace on 2026-10-08; this CI job cannot infer or certify the current SDK HEAD.
- Source-unverified dependencies remain explicitly flagged, rather than described as active.
- Missing local manifest, obsolete entrypoint, unknown package mention or generated drift fails --check.
- Merchant bindings, fnf_* compatibility IDs and business resources are allowed; generic algorithm duplication must pass a parity/migration gate.
