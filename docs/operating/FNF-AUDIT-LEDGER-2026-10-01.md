---
project: fuelnfreetime
kind: audit-ledger
status: active
date: 2026-10-01
baseline_revision: 96fdacdfbd3e6f00b707e48c106c35793ae4eafb
---

# Fuel & Free Time audit ledger

Severity:
- P0 cannot responsibly launch
- P1 launch quality / correctness
- P2 conversion / operator experience
- P3 growth
- P4 future / aspirational

## FNF-001 — Community publishes stale/demo proof

Priority: P1
State: OPEN
Evidence: packages/heuristic-theme/storefront/community.html

Observed hard-coded values include 5K+, 23, 150+, Saturday March 15 2025, Garage Night LA, Sunday March 9 2025, Miami Scavenger Hunt, and April 2025.

Consequence:
a real client brand can appear to fabricate community scale or current events.

Outcome:
only publish verified community/event data. When none exists, render an intentional empty/coming-soon state.

Acceptance:
no unsupported count/event remains public; every published event has a real date/location/status and operator source.

## FNF-002 — Community contains a route mismatch

Priority: P1
State: OPEN

Evidence:
current community.html contains an anchor to /pages/community while the current public contract uses /community.

Outcome:
all public CTAs resolve through the current route contract.

Acceptance:
link checking finds no obsolete /pages routes unless an intentional compatibility redirect exists.

## FNF-003 — Store performance renders structured unavailability as strings

Priority: P1
State: OPEN

Evidence:
- backend resolveStorePerformance returns unavailableMetric objects for lcp_ms, inp_ms, cls, sessions_desktop, sessions_mobile
- frontend store.html passes those values to formatMs, String, or template interpolation
- screenshot shows object-string rendering

Outcome:
metric UI understands value, unavailable, loading, error, source, and as-of states.

Acceptance:
no object-string output; unavailable metrics render an explicit unavailable/not-configured state; numeric metrics retain units.

## FNF-004 — Online Store active-theme edit link is hardcoded to Shop

Priority: P1
State: OPEN

Evidence:
apps/ecommerce-cms-agentsam/backend/admin/store.js resolves edit_href as /admin/theme-editor?slug=shop.

Outcome:
separate global theme/preset editing from page editing, or require page selection.

Acceptance:
Online Store no longer silently claims Shop is the universal theme-edit target.

## FNF-005 — Theme Editor page/slug desynchronization is reported but not proven by missing source logic

Priority: P1
State: VERIFY

Evidence:
operator reports the selected page/slug does not reliably follow.

Current theme-editor.js already sets the next slug, replaces the URL query, reloads page data, updates links, refreshes preview, and saves section endpoints using current slug.

Outcome:
reproduce the exact runtime failure and fix the broken state boundary rather than rewriting already-present switching logic.

Acceptance test:
for Home, Shop, About, Community:
1. open editor,
2. switch via page menu,
3. confirm URL,
4. confirm preview route,
5. change a unique field,
6. save,
7. refresh,
8. reopen,
9. verify no cross-page write.

Capture the save endpoint each time.

## FNF-006 — About is still a large one-off HTML composition

Priority: P1
State: OPEN

Evidence:
packages/heuristic-theme/storefront/about.html contains a large page with embedded layout/style/content concepts.

Outcome:
migrate valuable sections into versioned section schemas consumed by CMS/theme editor.

Acceptance:
About can be rebuilt from reusable sections without editing monolithic page source.

## FNF-007 — Community architecture is one-off rather than content-driven

Priority: P1
State: OPEN

Outcome:
portable schemas/data for story/gallery, event, event archive, submission, collaboration CTA, signup.

Acceptance:
empty, populated, and archived states render without hardcoded demo business facts.

## FNF-008 — Social preview image requires verification

Priority: P1
State: VERIFY

Evidence:
Preferences screenshot showed a weak/broken image preview. Preferences code already has socialImageUrl and preview behavior, so failure may be path/reachability/normalization rather than missing UI.

Outcome:
one validated asset reference works in admin preview, public metadata, and external fetch.

## FNF-009 — Page Editor and Theme Editor must remain one CMS truth

Priority: P1
State: ACTIVE DESIGN CONTRACT

Outcome:
- Page Editor: title/content/status/search metadata
- Theme Editor: layout/sections/blocks/media/presentation
- same canonical page/section persistence

Acceptance:
same section edited through either valid surface resolves to one versioned CMS record with deterministic conflict behavior.

## FNF-010 — Product → cart → payment → fulfillment needs one release proof

Priority: P0 before public launch
State: VERIFY

Existing contracts indicate checkout/reservation/webhook/provider work, but launch readiness requires one evidence chain.

Outcome:
product → sellable variant → cart → server validation → checkout → payment confirmation → order → fulfillment/provider state.

Acceptance:
happy path and at least one failed-payment/recovery path pass against current production-equivalent build.

## FNF-011 — Existing media library should become default asset source

Priority: P2
State: ACTIVE

Outcome:
operators choose previously uploaded client media without rediscovering/reuploading hundreds of files.

Acceptance:
search/filter existing media → select → preview aspect ratios → optimize when requested → attach/publish → retain original identity and usage history.

## FNF-012 — Analytics cards require data provenance

Priority: P2
State: OPEN

Outcome:
every metric card shows value, unit, source, as-of, coverage, unavailable/error state, drill-down.

## FNF-013 — Growth UI needs a real campaign lifecycle

Priority: P2
State: OPEN

Outcome:
campaign → audience → channels → assets/content → draft/review → publish/export → attribution/reporting.

## FNF-014 — Markets has no confirmed client requirement

Priority: P4
State: PARKED

Promote only with real multi-region/currency/catalog/language/tax/shipping requirements.

## FNF-015 — POS has no confirmed client requirement

Priority: P4
State: PARKED

Promote when real event/pop-up/in-person selling requires it.

## FNF-016 — Email needs a contract before expansion

Priority: P3
State: PROPOSED

Define mailbox identity, provider sync, permissions, threads, outbound rules, templates, attachments, audit trail, automation, and retention first.

## FNF-017 — Brand production-master assets remain partly TBD

Priority: P1
State: OPEN

Evidence:
canonical brand dossier still marks production master/vector asset details as needing completion.

Outcome:
approved primary logo, alternate marks, vectors, usage rules, and export assets.

## FNF-018 — Completeful first live provider sync is still pending

Priority: P0 if Completeful is the launch fulfillment provider
State: VERIFY / BLOCKED BY RUNTIME CONFIG

Evidence:
AGENTS.md states the Completeful Phase A client/catalog runtime is implemented in code, but CAPP_KEY and the first provider sync are still pending.

Outcome:
the selected launch fulfillment provider is authenticated, synced, and proven against the actual product/variant mapping used by the storefront.

Acceptance:
a launch product can be traced from local commerce truth through provider mapping/sync and into a verifiable fulfillment-ready state.

## FNF-019 — Order confirmation email is not yet implemented

Priority: P1
State: OPEN

Evidence:
AGENTS.md explicitly states there is no Resend send on checkout for order confirmation.

Outcome:
successful payment produces an appropriate customer confirmation through the selected transactional-email path.

Acceptance:
a successful checkout sends a real confirmation containing the correct order identity and no duplicate send occurs during webhook retries.

## FNF-020 — Store password / B2B preferences are saved but not enforced

Priority: P2 when disabled; P0 if the client intends to rely on either gate
State: OPEN

Evidence:
AGENTS.md states the preferences are persisted but storefront enforcement is not implemented.

Outcome:
either hide/label these controls as unavailable or implement and test real enforcement before presenting them as working controls.

## FNF-021 — Order-detail admin API is incomplete

Priority: P1 for launch operations
State: OPEN

Evidence:
AGENTS.md states order admin is list-only and has no line-items endpoint.

Outcome:
an operator can inspect enough order detail to support fulfillment, customer questions, refunds/exceptions, and troubleshooting.

Acceptance:
open an order from the list and verify products/variants/quantities, payment state, fulfillment state, customer/contact, totals, and timeline are available from canonical backend data.

## FNF-022 — Gmail OAuth is not wired

Priority: P3
State: PARKED / DEFINE EMAIL CONTRACT

Evidence:
AGENTS.md states mail UI exists but the Gmail OAuth route is not wired.

Outcome:
do not present Gmail-backed mailbox sync as a current capability until provider authorization, ownership, sync, and permission behavior are implemented and tested.

# Closeout rule

An item is not DONE because code changed.

It is DONE when its acceptance test has proof: screenshot, test output, URL behavior, request/response, artifact, commit, metric, or operator verification.
