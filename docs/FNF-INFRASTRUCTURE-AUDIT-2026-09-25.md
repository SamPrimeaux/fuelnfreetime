# Fuel N Free Time infrastructure audit — 2026-09-25

This report records the production state inspected during the Heuristic storefront/CMS release. It distinguishes current authority from historical migrations and proposes cleanup without reintroducing fallbacks.

## Release and migration record

- Storefront/theme packaging landed in `9a1812c`, `01b45e9`, and `e86133f`.
- `COMPLETEFUL_ALLOW_LIVE_WRITES` is intentionally enabled in `5ebed96`.
- The storefront collections production migration completed successfully: 6 statements and 21 affected rows.
- Production D1 database: `fuelnfreetime` (`9fd6ff92-e407-4b51-8b01-3c93f3845bb2`).
- Production R2 bucket: `fuelnfreetime`; Worker binding: `WEBSITE_ASSETS`.
- Production KV namespace: `fuelnfreetime-cache`; Worker binding: `CMS_CACHE`.
- Production Vectorize index: `fnf-agentsam-bge-m3-1024`, 1024-dimensional cosine vectors.

## Priority findings

| Priority | Finding | Resolution or next action |
| --- | --- | --- |
| P0 fixed | Published CMS assembly could follow `page_sections.content_r2_key`, which is the editable draft pointer. | Published reads now derive the immutable published R2 key and a regression test proves drafts cannot leak into the public KV snapshot. |
| P0 fixed | `cms:post-deploy` called public read endpoints when `CMS_WARM_SECRET` was missing and reported that as warming. | The script now fails visibly. A warm is only successful after authenticated `POST /api/internal/cms/warm`. |
| P1 | `assets.fuelnfreetime.com` is active in the R2 control plane but currently returns 404 for known objects. | Keep storefront URLs on the verified `/media/*` Worker route until DNS/custom-domain routing is repaired and a known object returns 200. |
| P1 | Vector content was last embedded in June 2026 and is stale relative to the September storefront/CMS changes. | Re-index CMS, product, and repository sources before treating retrieval as current. |
| P1 | `agentsam_ai` contains duplicate seed rows and at least one stale model identifier. | Add a canonical unique key, retire superseded model rows, and validate configured models against the current provider catalog. |
| P1 | The CMS build deploy-hook URL is duplicated inside D1 handler configuration. | Keep the URL in one secret environment reference; store only the reference and non-secret routing metadata in D1. Rotate the hook after cleanup because a hook URL is a bearer credential. |
| P2 | Old migrations and docs still mention `tenant_id`, `workspace_id`, `default_workspace_id`, `is_platform_global`, and legacy CMS table names. | Treat those files as history. Do not replay them. Current account authority and table names are documented below. |

## D1 ownership and schema drift

Current client authority is:

```
auth_users.default_account_id
  -> accounts.id
  -> account_memberships(account_id, user_id, role)
```

The inspected production users have default accounts and matching memberships. The live schema does not use `tenant_id`, `workspace_id`, or `default_workspace_id` for Fuel N Free Time authorization. IAM may still use labels such as `tenant_fuelnfreetime` and `ws_fuelnfreetime` for cross-system coordination; those labels must not become authorization fallbacks inside this client database.

Drift classifications:

- `tenant_id`, `workspace_id`, `default_workspace_id`: historical migration/document terminology, not current client ownership.
- `is_platform_global`: remains on `agentsam_workflows`; it is a catalog visibility flag, not tenant authorization. Rename to a capability-specific field in a future contract migration if the workflow catalog remains client-owned.
- `default`: acceptable only as a UI or seed label. It must not bypass account resolution.
- `hosted` image/media fields: prefer stable R2 object keys as stored authority and derive `/media/{key}` or the repaired custom-domain URL at render time. Do not persist short-lived signed URLs.
- `agentsam_products`: intentionally developer-created AgentSam product metadata and not Completeful merchandise. Do not add Completeful fallback ownership to it.

Current CMS tables are `pages` and `page_sections`, not `cms_pages` and `cms_sections`. Current user authority is `auth_users`, not `admin_users`.

## CMS storage contract

A page is metadata plus ordered sections/blocks; a single HTML file is not the CMS page authority.

| Layer | Role | Authority |
| --- | --- | --- |
| D1 `pages` | Route/title/status and page identity | Authoritative metadata |
| D1 `page_sections` | Order/status/version and draft R2 pointer | Authoritative index |
| R2 draft/published/history JSON | Section/block bodies | Authoritative content |
| KV `cms:page:{slug}:v1` | Preassembled public snapshot | Derived cache only |
| `CMS_EDITOR` Durable Object | Per-page collaborative WebSocket room | Ephemeral coordination, not content authority |

`CMS_WARM_SECRET` authenticates the internal cache rebuild endpoint. It does not encrypt CMS content. The Worker compares `X-Cms-Warm-Secret` on `POST /api/internal/cms/warm`; the endpoint rebuilds published page snapshots from D1 plus published R2 documents into KV.

The Durable Object uses the page slug as the room name (`idFromName(pageSlug)`). Seeing a `shop` instance means an editor opened the shop collaboration room; it is not another shop database or a page fallback.

KV currently contains published page snapshots plus short-lived AgentSam prompt/recent caches. It is small, but older AgentSam records use `ws_fuelnfreetime` while newer keys use the Cloudflare account ID. Normalize future cache keys to explicit `account:{account_id}` scope, keep TTLs, and never inject all cache values into every prompt.

## R2 layout and serving contract

Use these stable top-level prefixes:

```
cms/global/{draft|published|history}/...
cms/pages/{slug}/{draft|published|history}/...
3d-models/...
products/{product-slug}/...
uploads/...
agentsam/...
archive/...
```

`archive/` is immutable provenance, not a live-content destination. New CMS media should be selected by media ID/object key in the editor and rendered through `/media/{key}`. Product and CMS tables should not hardcode the public hostname.

Do not make a public R2 bucket the sole backup for executable Worker/admin/login code. Git plus reviewed release artifacts remains the deploy authority. If disaster recovery independent of GitHub is required, publish private, versioned source/build bundles to a locked R2 prefix with checksums and retention; do not serve those bundles publicly.

### 3D relocation and optimization

The live GLB moved from:

```
archive/shopify-import/3d-models/Emblem_of_Elegance.glb
```

to:

```
3d-models/emblem-of-elegance.glb
```

The source was 8,317,344 bytes. A Draco + WebP + 1024px texture pass produced a validator-clean 411,528-byte GLB, a 95.05% reduction. The paired USDZ was copied to `3d-models/emblem-of-elegance.usdz` unchanged. Archive originals remain recoverable.

Reproducible optimization command:

```sh
npx @gltf-transform/cli optimize input.glb output.glb \
  --compress draco --texture-compress webp --texture-size 1024
npx @gltf-transform/cli validate output.glb
```

For future models: remove unseen geometry and animation tracks, atlas/reuse textures, keep hero textures at 1024px unless a close-up proves 2048px necessary, compress geometry, lazy-load after the static poster, suspend rendering offscreen, honor reduced motion, and set a practical GLB budget of 1 MB or less for a storefront hero.

The verified production path is `/media/3d-models/emblem-of-elegance.glb`. The R2 custom domain must not replace it until `https://assets.fuelnfreetime.com/3d-models/emblem-of-elegance.glb` returns the same object successfully.

## Completeful writes and webhook secrets

`COMPLETEFUL_ALLOW_LIVE_WRITES=true` removes the application-level live-write block. It does not bypass Completeful authentication, validation, inventory rules, or route authorization. Use a low-risk read/sync proof before initiating a real order or product mutation.

Completeful supplies a distinct signing secret for each registered webhook. Do not collapse provider verification to one invented shared value unless Completeful adds that capability. Reduce environment-variable sprawl by storing one secret JSON map (or Cloudflare Secrets Store references) keyed by canonical event topic:

```json
{
  "catalog.product.created": "...",
  "order.created": "...",
  "product.publish.succeeded": "..."
}
```

Runtime flow: normalize the incoming topic, resolve exactly one entry, verify the signature, then dispatch. D1 should store the canonical topic and a secret reference, never the secret. Keep a temporary compatibility reader for existing per-topic names only during a measured rotation; delete it after all webhook registrations have been revalidated.

## GitHub integration

`FNF_GITHUB_CLIENT_ID` plus `FNF_GITHUB_TOKEN` does not make this a GitHub App.

- `FNF_GITHUB_CLIENT_ID` belongs to an OAuth authorization flow, which also requires `FNF_GITHUB_CLIENT_SECRET`; that secret was not present in the inspected Worker secret list.
- `FNF_GITHUB_TOKEN` is a service-token/PAT fallback used for repository API calls.
- A GitHub App would have an App ID, installation ID, and private key, and would mint short-lived installation tokens with repository-scoped permissions.

Preferred destination: create a GitHub App, install it only on the Fuel N Free Time repository, mint installation tokens server-side, and remove the long-lived PAT fallback after the OAuth/repository flows are migrated.

## Vectorize, retrieval, and AgentSam CLI proof

The current system is custom retrieval: D1 source records -> Workers AI `@cf/baai/bge-m3` embeddings -> `FNF_VECTORIZE` -> application-side retrieval. There is no managed Cloudflare AI Search instance. The index contains 55 current account-scoped chunks (19 CMS, 3 product, 33 repository) and needs a refresh.

Run the canonical CLI from the Inner Animal Media repository; there is no independent AgentSam CLI binary in this client repo:

```sh
/Users/samprimeaux/inneranimalmedia/bin/agentsam doctor --deep --remote
/Users/samprimeaux/inneranimalmedia/bin/agentsam repository inspect --help
/Users/samprimeaux/inneranimalmedia/bin/agentsam repository index-plan --help
/Users/samprimeaux/inneranimalmedia/bin/agentsam repository reindex --help
/Users/samprimeaux/inneranimalmedia/bin/agentsam cms contracts --help
/Users/samprimeaux/inneranimalmedia/bin/agentsam cms inspect --help
/Users/samprimeaux/inneranimalmedia/bin/agentsam migrate status --help
```

Use `./bin/agentsam` after changing into `/Users/samprimeaux/inneranimalmedia`; a bare `agentsam` may resolve to another executable. Test account scoping, retrieval source attribution, stale-source replacement, and the no-cross-account filter before adding AI Search. AI Search is a possible managed replacement when automatic R2 ingestion/citation generation is more valuable than the custom D1 source graph, not an additional parallel authority by default.

## AI model routing and cost labels

The Worker has both `AGENTSAM_WAI` and `OPENAI_API_KEY`. Keep routing task-based and explicit:

| Lane | Suggested default | Notes |
| --- | --- | --- |
| Simple chat/classification | a small current Workers AI instruct model | Low latency; included-allocation label until daily neurons are exhausted |
| Marketing/content | GPT-OSS 120B or a current Llama 70B quantized variant | Require provider-catalog validation and quality fallback |
| Code assistance | Qwen coder class by default; Kimi code only as paid opt-in | Label paid-plan-required models before invocation |
| Image drafts | Flux Schnell | Draft/iteration lane |
| Higher-quality image | current paid quality model | Show expected metering before generation |
| Embeddings | `@cf/baai/bge-m3`, 1024 dimensions | Must continue matching the existing Vectorize index |

The current `agentsam_ai` registry is not ready to drive UI truth: it is duplicated across seed generations and includes a stale Llama identifier. Add a provider-catalog sync/validation job and expose three honest badges: **included allocation**, **metered after allocation**, and **paid plan required**. Workers AI's free allocation is limited, not unlimited/free production inference.

## Deploy hook

Cloudflare's `fuelnfreetime-cms-deployhook` builds `main`. D1 has active hook registrations for CMS deploy build, publish, and post-deploy. The build hook currently duplicates the full bearer URL in `handler_config_json` while also naming an environment reference. Normalize it to:

- D1: event, handler type, enabled flag, `url_env` reference, timestamps.
- Secret environment/local deployment store: actual hook URL.
- Runtime: resolve the reference only at dispatch time and redact it from logs/admin APIs.

## Handoff checklist

- [x] Storefront/CMS work committed and merged to `main`.
- [x] Storefront collections migration applied to production D1.
- [x] Completeful live-write gate enabled in deploy configuration.
- [x] Published CMS/draft isolation fixed and covered by a regression test.
- [x] GLB optimized, relocated, and served through the Worker media route.
- [ ] Repair and prove the `assets.fuelnfreetime.com` R2 custom-domain data path.
- [ ] Re-index AgentSam CMS/product/repository sources.
- [ ] Normalize `agentsam_ai` and Completeful secret references.
- [ ] Rotate/remove the D1-embedded CMS deploy-hook URL.
- [ ] **Before accepting live payments, replace the sandbox `STRIPE_SECRET_KEY` with the live key, confirm the matching live webhook secret, and complete a controlled live checkout proof.**
