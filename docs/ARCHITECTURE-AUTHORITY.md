# AgentSam Ecommerce — Current System & Architecture Authority

> **Authority as audited 2026-10-08.** This is a code-backed ownership and convergence map, not a claim that every SDK package is already wired to FNF or that every production workflow has passed end-to-end.
> Current local/SDK package identities, versions, source references and compatibility paths: [generated inventory](generated/package-authority.md). Update the machine-readable annotations in [`package-authority.json`](package-authority.json); do not manually edit the generated table.

## Product identity and the development law

`apps/ecommerce-cms-agentsam` is the reusable ecommerce product's working application composition. **Fuel & Free Time is customer #1, the first paying installation and the live reference implementation—not a disposable donor or a merchant-specific fork.** Its real product, order, media, CMS and AgentSam workflows are where reusable behavior is proven.

**This repo already contains production infrastructure. The present work is consolidation, reuse, integration and contract enforcement—not designing an imaginary infrastructure from zero.**

The intended next-merchant path is: **install existing application packages → provide merchant configuration and provider connections → apply brand/theme → seed catalog/media/content → verify and deploy**. Not another custom CMS, Side Assistant, order system, media pipeline or toolkit.

### SDK/package-first; prove behavior against reality

1. Before writing a reusable capability, inspect *actual package manifests, exports, consumers and runtime tests* in the FNF workspace and AgentSam SDK. Identify the existing implementation authority.
2. If that package already handles the case, inject FNF-specific bindings, identity, scope, data and policy. Do not add an app-local equivalent.
3. If working FNF production machinery does something better or missing upstream, prove behavior first; **promote that proven behavior into the existing canonical package** and then make FNF consume it.
4. Where parity is not yet proven, keep existing FNF production processing operational and label the convergence target explicitly. Do not delete it simply because a package with a similar name exists.
5. Retain `fnf_*` when it identifies a tenant resource, compatibility tool ID, seed, session state or customer-specific rule. Avoid new `fnf_*` implementations of operations that belong to the ecommerce/AgentSam product. Do not blindly rename historical D1 tables, workflows or public APIs.
6. Do not create parallel owner tables, editor/renderer systems, OAuth registries, section spines, content libraries or provider abstractions when an existing owner can be extended.

**Completion test:** FNF works against real workflows **and** another merchant can consume the same implementation by supplying configuration/data instead of copying code.

## Authority layers

| Layer | Canonical responsibility | Installation-specific material |
| --- | --- | --- |
| Ecommerce application (`apps/ecommerce-cms-agentsam`) | App composition, commerce workflows, hosting the editor/inspector, permissions/route bindings | FNF catalog, orders, customers, navigation content, store policies |
| Workbench / `admin-dock` | Mini composer, Side Assistant interaction, `+` and `@` capability/resource selection, run-mode presentation and dock placement | FNF resource resolvers, route context, theme tokens |
| Theme contract / CMS runtime / section library | Theme/section schemas, draft/preview/edit/publish, implementation artifacts | Selected theme, merchant pages, settings and content |
| Asset Core + Content + Content Studio + Media Kit | Asset identity, lifecycle, provider refs, gallery, previews/collections | R2 binding, CDN, media assets, presets |
| Merch + provider adapters | Product/print preflight, transforms, manufacturing / provider behavior | Supplier account, product variants, chosen artwork |
| Knowledge + Cloudflare connector | Discovery, embedding/index/retrieve engine, Vectorize provider operations | Model/index/binding, source selection, account filters |
| Settings + Vault + Identity + Hooks | Auth/grants, installations, tools and execution capability resolution | User grants, tenant secrets, installed providers/tools |

### Repository contracts and graph authority (already exists)

- **Canonical owner:** SDK `@inneranimalmedia/agentsam-repository` at `agentsam-sdk/packages/agentsam-repository`, plus shared types at `packages/agentsam-contracts/src/repository.ts` and JSON schema at `protocol/repository/repository-contract.schema.json`.
- **Existing behavior:** `createRepositoryIdentity`, `createRepositoryContract`, `createRepositoryDependency`; repository statuses, contract types (`api/schema/runtime/cli/event/receipt/package`), required versions/contract hashes, dependency criticality, failure policies (`warn/block_certification/block_deploy/degrade`), Git context, Merkle graph and persistence.
- **Boundary:** this SDK package owns portable *repository and cross-repository dependency contract semantics*. Authenticated account ownership and deployments remain host-owned, as its README says. The SDK README currently recommends the SDK facade for external consumers pending standalone release-policy confirmation; its manifest lists version `2.6.12` as publishable. Resolve this before adding a direct FNF runtime dependency.
- **FNF `scripts/package-authority.mjs` is only a deterministic manifest/reference evidence collector and CI documentation drift gate**. It does not define repository identity, replacement dependency policies, contract hashing, certification or deployment orchestration. If promoting this scanner into a reusable cross-repository inspector, consume/export AgentSam Repository contracts instead of creating a parallel repository graph model.
- **Future proof:** project package inventories into repository contract/dependency records, verify required version and contract hash where applicable, and enforce failure policies centrally. That migration is not implemented by the current docs PR; do not claim certification from its `--check` output.

**Same-name version trap:** FNF contains local `@inneranimalmedia/agentsam-workbench` and `@inneranimalmedia/agentsam-merch` packages at `0.1.0`; the separately inspected SDK also provides these names at `2.6.12`. Local folder presence is not evidence that FNF is running the SDK implementation. Resolve imports and bundle paths explicitly before changing any behavior.

### Application spine (do not split)

- Page authority: `cms_pages`; placed section/block: `cms_page_sections`, `cms_section_blocks`; definitions: `cms_definitions`; artifacts/revisions: `cms_artifacts`, `cms_revisions` and immutable R2 objects. Renderer/section registries are compatibility inputs, not a new CMS owner.
- Real products, variants, inventory, orders and customer records remain commerce-owned. CMS sections store resource references and merchant-facing settings, not copies of product/order data.
- OAuth grants, plugin installations, registered tools and available capabilities are distinct authorities. Resolve them into a single view for Settings, composer `@` / `+`, and SideStage; a pill or locally configured plugin is not execution authorization.
- Visual references are implementation contracts, not decorative inspiration. See `apps/ecommerce-cms-agentsam/AGENTS.md` and `docs/ui-reference/agentsam-side-assistant/` for mounted-DOM and screenshot acceptance.

## Existing production machinery: what to reuse

### Knowledge / search: active FNF path versus SDK authority

- **Existing:** `apps/ecommerce-cms-agentsam/backend/agentsam/fnf-vectorize.js` calls Workers AI and the `FNF_VECTORIZE` index with FNF-specific scoping/result presentation. `backend/agentsam/vectorize-adapter.js` is **already configuration-driven and generic in behavior**, but still implements embedding creation, dimension checks and query calls locally. `scripts/embed-fnf-content.mjs` indexes CMS/products/repo content.
- **Available upstream:** SDK `@inneranimalmedia/agentsam-knowledge` implements AutoRAG and a `cloudflare_vectorize` backend; `@inneranimalmedia/agentsam-connector-cloudflare` source lives at `packages/connectors/cfoa` and supplies Vectorize query/upsert/delete/get/health operations.
- **Merchant configuration (keep):** `FNF_VECTORIZE`; `fnf-agentsam-bge-m3-1024`; `@cf/baai/bge-m3`; 1024 dimensions; account/workspace filter and CMS/product/repo source selection.
- **Safe convergence:** compare output shapes, token/chunk handling, filters, embed dimensions, retries, index operations, scope isolation, receipts and error behavior. After tests prove equivalent or better results, turn FNF adapters/scripts into config/compatibility wrappers around the canonical runtime. No blind alias that silently changes embeddings or leaks a tenant scope.

### Media/R2: working job engine, not a scaffold

- **Existing:** `lib/assets/{jobs,pipeline,process-job,worker-hook,image-optimize,classify,r2-client,completeful-product-assets}.js`; `apps/ecommerce-cms-agentsam/backend/assets/product-optimize.js`; `bin/fnf-assets`. Runtime includes `ASSET_JOBS`, R2 intake, classification, optimization, derivative/final asset handling, retries and stale-job recovery.
- **Already an alias:** `scripts/optimize-uploads-images.mjs` delegates to `bin/fnf-assets optimize`. Do not describe it as an independent optimizer.
- **Canonical target:** SDK Asset Core handles identity/provenance, Content handles lifecycle/provider representations, Media Kit handles collections/presentation, Merch handles product transforms, and Cloudflare Images owns that provider's operations.
- **Safe convergence:** preserve D1 `media_assets`/job record semantics, enqueue/ack/retry/failure/repair, original preservation, derivative identity, CDN delivery, product ownership, service credentials and operator recoverability. Prove parity with actual R2 job fixtures **before** redirecting workers or deleting any local processor.

### Provider/commerce

- `@inneranimalmedia/agentsam-provider-completeful` is an upstream provider adapter; FNF's `backend/completeful/*` and `scripts/create-completeful-product.mjs` need a caller/contract parity audit. App-specific orchestration, product mapping and merchant accounts remain in ecommerce.
- `apps/ecommerce-cms-agentsam/bin/ecommerce.mjs` already supports `info`, `doctor`, `preview`, `scaffold`. `doctor` validates source structure, not full runtime readiness or remote credentials. `bin/fnf-assets` remains a valid compatibility/operator entrypoint.
- Planned `ecommerce media`, `ecommerce knowledge`, `ecommerce catalog`, `ecommerce providers`, `ecommerce cms` should be implemented as **delegating command families**, not a new engine per CLI.

## Compatibility paths and migration discipline

The [generated inventory](generated/package-authority.md) classifies current entrypoints as **ACTIVE IMPLEMENTATION**, **ACTIVE OPERATOR TOOL**, **MERCHANT ADAPTER / CONVERGING**, **COMPATIBILITY ADAPTER**, or **COMPATIBILITY WRAPPER**. These labels describe present ownership and next actions; they do not mean a path is safe to delete.

For each migration, create a small evidence record: **original callers → canonical package/export → configuration mapping → behavioral parity (including auth/security, failure, retry, scope) → dual-path test → cutover plan → compatible public aliases → deprecated source removal**. Never remove an actively used script or bin on an untested assumption.

## Live implementation versus package inventory

- **ACTIVE REFERENCE** in generated docs means an FNF source import or bundling reference. It does not establish a live deploy or full runtime feature.
- **CONVERGING** means a real SDK package exists but the application's generic implementation/delegation still needs parity verification.
- **AVAILABLE** means the SDK package exists, without claiming it is used by FNF.
- **SOURCE_UNVERIFIED** is deliberate: `revise-theme`, `section-library` and `site-contracts` were mentioned/declared but their source package directories could not be found in the inspected SDK checkout. Do not upgrade their status without locating their source and verifying the manifest.

## Evidence and drift checks

Run from the FNF repository root:

```sh
node scripts/package-authority.mjs --stdout  # inspect from tracked source
node scripts/package-authority.mjs --write   # regenerate the checked-in report
node scripts/package-authority.mjs --check   # fail when docs/manifest references drift
AGENTSAM_SDK_ROOT=/path/to/agentsam-sdk node scripts/package-authority.mjs --check # also validate upstream package paths/names/versions
```

The checker enumerates the FNF app/package manifests, references in tracked runtime sources, package mentions in README/authority docs, curated legacy paths and an explicitly versioned SDK audit snapshot. It deliberately **does not claim remote runtime verification**. Setting `AGENTSAM_SDK_ROOT` enables cross-repo source manifest verification and fails on moved/missing SDK packages or version/name drift; leave unset in standalone FNF CI unless the SDK checkout is also provided. CI must run `--check` after changes to manifests, docs, consumers or scripts.

## Release/merchant #2 acceptance

Confirm application build, package resolution (including same-name workspace shadowing), migrations and tenant isolation, D1/R2/Vectorize/queue/provider bindings, admin/storefront routes, theme renderer, background job retry, OAuth/tool authorization and production preview/publish boundaries. Pass actual browser geometry/flow checks. Only then use the CLI scaffold to provision merchant #2 with its own secrets and data.

**Working infrastructure is a starting asset; duplicate implementations are the liability.**
