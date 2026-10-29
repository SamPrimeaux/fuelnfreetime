# Ecommerce CMS SDK to Fuel N Free Time: Customer 1 parity

## Authority and scope

- AgentSam SDK Ecommerce CMS owns reusable commerce/CMS editor functionality.
- Fuel N Free Time owns customer branding, CMS data, business-specific products/collections, payment integration and Worker deployment.
- Shared Theme Studio UI is pinned by scripts/sync-ecommerce-sdk-ui.mjs. Check mode verifies source hashes without the SDK checkout.
- No npm release or version bump is required to ship approved customer UI. This source-sync adapter is interim, not a substitute for the ultimate installed package.

## Measured divergence (October 29)

Git-tracked Ecommerce CMS package paths: SDK 567, FNF 487, shared paths 456. Of shared paths 364 identical, 92 diverged. SDK-only 111, customer-only 31.
Shared-path drift: backend 23/140; frontend/static 31/116; frontend/src 15/33; packages 9/56; cms 0/4.

Not all 92 differences are errors. FNF-only products, collection editors and manufacturing components must not be overwritten.

## First pinned parity wave

- Shared embed UI JS/CSS, Theme Settings bridge and manifest catalog generator are content-hash pinned to SDK source.
- Embed defaults sync without replacing FNF manifest identity/tenant metadata.
- App Embeds shows five available preview types, not installed or enabled services. No backend writes or form submissions.
- Existing FNF theme-editor controller, CMS previews, theme-preview-runtime, storefront and product/collection apps remain.
- Build and deploy guards validate the receipt and catalog; upstream mode compares against an available SDK checkout.
- SDK package version 2.6.13 and FNF internal private copy version 0.2.0 are still different release identities.

## Next persistence migration

Live FNF D1 contains cms_pages, cms_page_sections, cms_section_blocks, cms_globals, cms_revisions, cms_definitions, cms_artifacts and newsletter_subscribers. It does not contain cms_components.
Audit existing APIs before introducing component placement/configuration, tenant authorization, versioned draft/publish, form submissions and subscriber consent. The current UI creates none of these records.

## Graduation priority

1. Package the canonical Theme Studio presentation, inspectors and CMS API contracts with customer theme/route adapters.
2. Graduate FNF-only collection, product quality/repair and manufacturing geometry capabilities into reusable tested SDK packages.
3. Reconcile media, product and collection backend differences, preserving tested customer fixes and real data.
4. Add upstream-triggered cross-repository PRs to bump pinned SDK digests; the offline receipt alone cannot detect remote SDK updates.
5. Remove duplicated FNF app engine only after the versioned SDK passes customer CMS, checkout and media acceptance.

Acceptance: one canonical SDK implementation per shared capability, explicit customer overlays and reproducible customer deployment artifacts.
