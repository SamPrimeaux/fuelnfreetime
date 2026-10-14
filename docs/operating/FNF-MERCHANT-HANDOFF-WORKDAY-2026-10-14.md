# FNF merchant handoff workday — October 14, 2026

**Owner repository:** `SamPrimeaux/fuelnfreetime`  
**Primary outcome:** one real Completeful-backed FNF product can be designed, saved, edited, published into a real collection, reopened, and used in the storefront bag by the merchant without engineering intervention.  
**Status at planning:** **BLOCKED / NOT ACCEPTED**. This is a work queue and evidence contract, not a claim of live completion.

Read with [FNF Product Workflow](../FNF_PRODUCT_WORKFLOW_CREATIVE_TO_COMMERCE_20261006.md), [Completeful Runtime Contract](../RUNTIME-CONTRACTS-COMPLETEFUL.md), [Creation Station Plan](../FNF_CREATION_STATION_MASTER_SPRINT_PLAN_20261006.md), [Product Quality/Acceptance](../engineering/PRODUCT-QUALITY-ACCEPTANCE-AND-RELEASE-CONTRACT.md), and [AgentSam Tool Recovery](../AGENTSAM-TOOL-INFRASTRUCTURE-RECOVERY-TODO-2026-10-14.md). Do **not** create competing database families, a new Product Studio, another checkout, or an alternative API integration.

## Verified baseline (read-only audit, 2026-10-14 UTC)

- Production FNF D1: 1 primary active Completeful shop; enabled `agentsam_plugins.completeful` registration; 49 mirrored catalog products; 456 variants.
- An existing **Comfort Colors 1717 garment-dyed T-shirt** draft corresponds to local `products.id=7`. One original PNG is linked to it. No prepared media, provider design, provider render or nonzero retail price were recorded at the audit; the product was still `draft`.
- One older provider product link exists for another product; **zero** `completeful_variant_links` existed in live FNF D1. That is not proof of a working sellable SKU.
- 3 live collections but only 1 `store_collection_products` membership. Adding a product to a collection is done in **Product Details**, not the Studio canvas.
- Source: Product Studio already uses shared `adminFormFetch` for uploads, has **Next step · Product details** handoff, and Product Details exposes **Create with Completeful**, meaning **create/link a product in an already integrated shop**, *not* connect a new Completeful account. Do not resurrect obsolete wording or duplicate the integration.
- Existing checkout reads `product_variants.inventory_qty`; provider-created variants currently initialize to zero. Made-to-order handling must be corrected without inventing artificial inventory.
- Current `main` already includes Product Studio PRs #104, #106, #109, #112. Tool-audit/guardrail PR #114 is merged; live tool execution and neutral-ID D1 migration are *not* complete.

## Work lanes: focus and acceptance

### P0 / Product + provider (one owner, morning)

- [ ] **Reproduce and resume, do not reseed.** Open `/admin/products/create/<catalog-product-id>` for the existing Comfort Colors 1717 draft. Record product/draft IDs, source and selected color/size/print side; verify saved design and original PNG survive reload.
- [ ] **Repair the earliest failing stage:** Prepare for print. Verify production derivative PNG exists in R2 and `media_assets`, has a distinct ID from the original, retains transparency, has valid public URL, and is reloaded by Product Studio after navigating away. Prove failure/expired-login handling without hidden HTML parse errors. Do not overwrite originals.
- [ ] **Visual correctness:** verify chosen real garment front/back and color against provider catalog imagery; print placement, dimensions/DPI and prepared art follow the selection. Do not substitute a generic black silhouette or stock image for a false preview.
- [ ] **Go to Product Details:** verify real `products.id` handoff; save title, description, retail price, SEO, approved primary image and at least one real collection membership; leave/reload and read values back from D1.
- [ ] **Provider gate:** read actual `/api/admin/completeful/status` and credential mode without exposing secrets. Test provider mutations only with authorized `capp_test_` dry-run or an approved no-cost test fixture; do **not** enable production live writes, place manufacturing orders, or charge a payment method for smoke tests.
- [ ] **Create with Completeful:** the existing Product Details action should create the design/store product *once*, capture provider IDs and D1 `completeful_operations`, and map selected catalog variants to local `product_variants` and `completeful_variant_links`. Retry the operation to prove no duplicate provider product.
- [ ] **Prove provider mismatch recovery:** if the provider create succeeds and the local write fails, resuming must reconcile and complete mappings, not lie with `already_linked` when variants are missing. Record receipt and blocked state clearly.

### P0 / storefront + sellability (different owner, midday/afternoon)

- [ ] **Fix made-to-order availability** for linked Completeful SKUs through an explicit supported policy; don't set arbitrary positive warehouse quantities. Confirm that a valid variant can be added to the bag and a disallowed one is rejected.
- [ ] **Publish only when valid:** at least one fully mapped variant, approved storefront image, positive retail price, real collection membership, and truthful availability. Verify public PDP, selected variant and bag, then edit in Product Details and check live update.
- [ ] **Make 2–4 additional genuine FNF products** only after the first succeeds, using the same admin flow and existing collections. No direct SQL seeding as a substitute for the merchant workflow.

### P1 / storefront and CMS mobile (independent owner, after first product path)

- [ ] Verify Home → Collection → PDP → Bag on iPhone; fix broken responsiveness, empty states and imagery. Preserve approved FNF copy/design.
- [ ] Fix documented Theme Studio iPhone bottom gap, section/inspector selection, image picker sizing, save/reopen and miniAgentSam loading. Preserve the mobile dock; compare to existing approved screenshots.
- [ ] Capture inspected phone/tablet/desktop screenshots and reproduce prior failures before closing. An isolated passing CSS or DOM test does not establish acceptance.

### Separate / AgentSam tool infra (do not block the product demo)

- [ ] Classify all 35 registered operations as working / broken / missing / degraded with real execution receipts; 9 Completeful-named tools include 5 degraded adapter paths. Internal paid fulfillment is **not automatically model-callable**.
- [ ] Resume only after reconciling the untracked local `scripts/agentsam_tool_ids.py` and current GitHub main. PR #114 secured the audit/guardrail, *not* the live migration. Do not run partial neutralization SQL.

## Your checkpoints (merchant/founder — not another debugging shift)

- **Morning:** inspect one actual product design and print preview on your iPhone. Accept/reject the garment, color/placement, art and usability.
- **Midday:** attempt the same **Next step → Product Details → Save** path yourself. Agent owns technical failures; you should not provision tools, chase selectors or run SQL.
- **Afternoon:** independently find the published product in a collection, open its PDP, select a variant, add to bag, and confirm edits persist. Only then approve creation of more products.
- **End of day:** review a compact evidence receipt for each completed lane and the open defect list. Defer any unrelated architecture / naming projects.

## Every agent's closeout contract

1. Start on a current GitHub-main-based, **distinct** focused branch/worktree. Confirm source owner and related ongoing work before editing. **Preserve existing local untracked files and original assets**.
2. Give a reproduction and one clear acceptance criterion. Change the minimum correct code paths. Run relevant tests plus authentic session/browser/R2/D1/provider evidence and visual checks for UI changes.
3. Open focused PR, review, merge into `main`, build/deploy through the established authorized pipeline, verify the served commit and affected route. **Only then** prune fully merged, clean worktrees.
4. Report: branch / PR / main SHA / deployed Worker identity / tested device & route / D1 provider IDs/receipts (never secrets) / passed & failed criteria / remaining blockers.
5. **No evidence = not done.** No hidden provider writes, fabricated inventory, optimistic saved-state claims, fake tool success, FNF defaults added to reusable core, or "build green" as customer acceptance.

**If the provider test key/live API cannot be safely verified:** stop before mutations, label provider creation BLOCKED, preserve all drafts/assets, and finish local Product Details, R2, collection, catalog/preview and UI tests without pretending a provider product exists.
