# Fuel & Free Time operating docs

These documents are the cross-domain planning, audit, launch, and productization layer for Fuel & Free Time.

They do not replace existing source-of-truth contracts.

## Authority order

1. Repository/source authority
   - AGENTS.md
   - docs/PIPELINE-OWNERSHIP.md

2. Runtime/domain contracts
   - docs/RUNTIME-CONTRACTS-COMMERCE.md
   - docs/RUNTIME-CONTRACTS-STRIPE.md
   - docs/RUNTIME-CONTRACTS-COMPLETEFUL.md
   - docs/RUNTIME-CONTRACTS-AGENTSAM.md
   - docs/FNF-CMS-SPRINT-2026-06-20.md

3. Brand truth
   - docs/brand/business-brand-dossier.md
   - This file is already marked canonical: true.
   - Do not invent a second brand source of truth.

4. Storefront/theme boundary
   - docs/STOREFRONT-CONTRACTS.md
   - packages/heuristic-theme/theme.json
   - packages/heuristic-theme/

5. Cross-domain operating layer
   - FNF-SITE-OPERATING-BRIEF-2026-10-01.md
   - FNF-PAGE-ADMIN-CONTRACTS-2026-10-01.md
   - FNF-AUDIT-LEDGER-2026-10-01.md
   - FNF-AGENTSAM-AUTOMATION-MAP-2026-10-01.md
   - FNF-RESPONSIVE-SPEC-AND-DOCK-PLAN-2026-10-04.md

6. Reusable planning scaffold
   - docs/templates/UNIVERSAL-BRAND-SITE-OPERATING-BRIEF.md

The operating layer answers a different question from the runtime contracts:

Given the real brand, real runtime, and real current UI, what outcome are we trying to produce, what blocks it, how do public and admin surfaces fit together, and how do we prove a milestone is done?

## State vocabulary

- CONFIRMED — current, approved, and safe to build/publish around.
- PROPOSED — a recommendation awaiting owner/client approval.
- TBD — a real decision or verified fact is still needed.
- ASPIRATIONAL — future direction, not a current promise.
- REJECTED / NOT US — intentionally outside the project.
- DEPRECATED — previously used and intentionally being replaced.
- OBSERVED — directly seen in code, runtime output, screenshots, or live behavior.
- REPORTED — operator/user observed; requires reproducible verification if source does not itself prove failure.

## Evidence vocabulary

Existing material should be classified as KEEP, REFINE, REBUILD, MERGE, REMOVE, or UNKNOWN / VERIFY.

Never turn an aspiration into a current feature, a screenshot into a backend claim, or a UI placeholder into a business fact.

## Working rule

Fuel & Free Time is the paying client and launch target.

The ecommerce/admin system is also a proving ground for reusable packages, but reusable extraction must not delay P0/P1 client launch work.

A client implementation can prove a pattern. It does not automatically become the generic package. Before extraction, remove client identity/content/data, identify the portable contract, make provider/business assumptions configurable, provide neutral fixtures, and test the result in another context.
