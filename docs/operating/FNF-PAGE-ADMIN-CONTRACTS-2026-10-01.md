---
project: fuelnfreetime
kind: page-admin-contracts
status: working
date: 2026-10-01
---

# Fuel & Free Time page and admin contracts

This file describes the job of each major surface.

It is not the brand source of truth and not a replacement for runtime contracts.

## Public page contracts

### Home /

Primary job: explain the belief quickly and route visitors to the next meaningful choice.

Primary CTA: shop current products/collections.

Secondary CTA: story/community/signup.

Must contain:
- clear brand thesis,
- real lifestyle media,
- product/collection path,
- brand-story bridge,
- trust cues,
- return/subscription path.

Must not become a second Shop page or depend on one-off HTML for every content change.

### Shop /shop

Primary job: product and collection discovery.

Authority: docs/STOREFRONT-CONTRACTS.md.

Must contain:
- collection navigation,
- current sellable products,
- price/options/availability,
- clear product-detail path,
- loading/empty/error states,
- responsive merchandising.

Reusable extraction:
- frosted/light header preset,
- collection-card schema,
- product-grid shell,
- collection story block.

### Product /products/:slug

Primary job: help a customer select a valid purchasable variant.

Commerce truth must come from commerce/runtime authority, not CMS copy.

Must verify real variant state, options, price, inventory/sellability, media, cart action, error state, and related collection/navigation.

### About /about

Primary job: make the brand belief and origin memorable.

Current source: packages/heuristic-theme/storefront/about.html.

Classification: REBUILD into section schemas; preserve useful ideas, not the monolith.

Target section family:
1. thesis/hero,
2. origin/moment,
3. Fuel meaning,
4. Free Time meaning,
5. founder/brand story,
6. principles/values,
7. visual story/video,
8. current community/product bridge,
9. CTA.

### Community /community

Primary job: make community participation real rather than decorative.

Current source: packages/heuristic-theme/storefront/community.html.

Observed static values include 5K+, 23, 150+, and 2025 event examples. Treat them as demo/stale implementation content until proven otherwise.

Target modules:
- community manifesto,
- real stories,
- gallery,
- real upcoming events,
- past-event recaps,
- story/media submission,
- collaboration,
- signup.

A truthful empty state is valid.

### Collaborate /collaborate

Primary job: turn partnership interest into a qualified inquiry.

Inputs:
- collaborator type,
- idea,
- location,
- contact,
- links/media,
- timing,
- consent where needed.

Output: trackable submission plus explicit next step.

### Policies /policies

Primary job: plain-language operational policies.

### Terms /terms

Primary job: legal/business terms and identity.

### Cart /cart

Primary job: validate and start payment without misleading the customer.

Acceptance path:
product → valid cart line → quantity/remove → discount → shipping state → identity → payment → failure/success → confirmation.

# Admin contracts

## /admin/home

Job: what needs attention today?

Use for order exceptions, inventory/provider issues, unpublished work, campaign/content tasks, and system health requiring action.

Avoid vanity cards with no action.

## /admin/orders

Job: find, inspect, act on, and audit payment/fulfillment state.

## /admin/products/create

Job: move from catalog/provider idea to a publishable product.

Target path:
catalog → product → artwork/media → options/variants → preview → price/margin → validation → publish.

Reusable productization should depend on provider capability contracts rather than Completeful-only assumptions.

## /admin/products/help/artwork

Job: prevent bad artwork/production inputs before product creation.

## /admin/products

Job: browse, filter, inspect, edit, publish/archive products using real commerce truth.

## /admin/inventory

Job: know what is sellable and why.

Distinguish internal product state, variant state, provider state, local/reserved quantities, sync freshness, and errors.

## /admin/subscribers

Job: operate audience data with consent/source clarity.

## /admin/growth

Job: turn real store/content signals into campaigns and measure outcomes.

Current classification: REFINE / WIRE.

Minimum useful flow:
campaign idea → audience → channels → content/assets → draft/review → publish/export → attribution/report.

Do not fake attribution.

## /admin/discounts

Job: create and inspect valid promotional rules.

## /admin/content

Job: canonical operator surface for reusable media/content organization.

Strong current direction:
- media type views,
- albums,
- upload,
- selection,
- side inspector,
- Details / Optimize / SEO / Usage / Versions.

Target improvements:
- multi-select,
- responsive crop previews,
- optimization receipts,
- alt/SEO metadata,
- duplicate handling,
- usage graph,
- publish/attach destinations,
- original vs derivative clarity.

## /admin/scaffold?view=markets

Status: PARK unless a real multi-market requirement exists.

Promote only when the client actually needs region/country segmentation, currency, catalog/price differences, language, tax/shipping, or channel behavior.

## /admin/analytics/overview
## /admin/analytics/finance
## /admin/analytics/health

Job: trusted decision surfaces.

Every metric needs source, as-of time, coverage, unit, empty state, unavailable state, error state, and drill-down.

## /admin/store

Job: store status, active theme/preset, preview, performance signals, edit/publish path.

Observed defect:
backend resolveStorePerformance returns structured unavailableMetric objects for web-vitals/session fields while the frontend formats those fields as primitives. This produces object-string output in the UI.

Contract:
the UI must understand metric states instead of stringifying structured unavailability.

## /admin/theme-editor?slug=...

Job: visual composition: sections, blocks, media placement, layout, responsive preview, publish.

Current source behavior already:
- reads slug from query params,
- sets slug = nextSlug,
- calls history.replaceState,
- reloads page data,
- updates Page Settings links,
- refreshes preview,
- saves sections against current slug.

Therefore the reported slug/page bug is REPORTED / REPRODUCE, not proof that switching logic is absent.

Separate confirmed issue:
the Online Store theme resolver advertises its active-theme edit link as /admin/theme-editor?slug=shop, so entering the editor from that surface is hardcoded to Shop.

Acceptance:
switch Home → Shop → About → Community; unique edits must remain scoped after save, refresh, and reopen.

## /admin/page-edit?slug=...

Job: structured page content, title, visibility/status, and page-level search metadata.

Boundary:
- Page Editor = document/content/search/visibility.
- Theme Editor = visual composition/layout/section controls.
- Both read/write the same canonical page/section model.

## /admin/preferences

Job: store-level access, global SEO/social defaults, navigation, logo/brand presentation, and global behavior.

The supplied screenshot showed an unreliable social-image preview. Verify saved asset URL, public reachability, normalization, preview rendering, and final metadata.

## /admin/scaffold?view=pos

Status: PARK until a real in-person selling workflow exists.

## /admin/agentsam

Job: contextual helper/operator surface.

Rule: AgentSam operates on the same page/product/media/order contracts as the admin. It must not create a second hidden state system.

## /admin/email

Status: PROMISING / DEFINE CONTRACT BEFORE EXPANSION.

Before expansion define mailbox identity, user ownership/permissions, threads, provider sync, outbound sender rules, templates, attachments, audit trail, automations, retention, and customer/order linkage.

# Reusable extraction rule

An admin component is portable only when:
1. F&FT identity/data is removable.
2. backend assumptions are explicit capabilities/adapters.
3. empty/loading/error states are generic.
4. fields derive from schemas/contracts where practical.
5. neutral fixtures are included.
6. a second brand/app can use it without forking business logic.
