# AgentSam Ecommerce + CMS

AgentSam Ecommerce + CMS is the reusable commerce workspace for independent brands and agencies. Fuel & Free Time is the reference installation.

## Product promise

Owners manage their storefront, CMS, media, catalog, products, email, analytics, and AgentSam assistance in one workspace. The product is sold as editable source plus implementation and operations services. It should not promise unattended profitability, guaranteed sales, or autonomous campaigns before those capabilities are implemented and verified.

## Release scope

- Responsive storefront with home, about, community, contact, product, cart, checkout, privacy, and terms pages.
- CMS drafts, preview, publishing, media management, and recovery.
- Product studio with supplier catalog discovery, artwork preparation, variants, real provider mockups, and an explicit publish flow.
- Stripe, Completeful, Resend, Cloudflare, and AgentSam adapters with account-owned secrets, webhooks, retries, reconciliation, and visible failures.
- Annotation-aware AgentSam assistance scoped to the current page, product, or selected element.
- Consent-aware analytics and customer communication with approval and cost controls.

These are release requirements, not claims that every capability is complete today.

## Current reference implementation

The reference installation has a working commerce/CMS foundation, product and media administration, Completeful catalog browsing, and an artwork workspace. The shared shell and contextual inspector are app-owned. React content mounts inside the existing shell so CMS pages, product editing, and the studio have one navigation renderer.

The dashboard navigation is one responsive component/system, `CommerceAdminNav`. It owns one nav tree and one visual language, with three presentations: desktop expanded left rail, desktop compact icon rail, and a tablet/mobile left slide-in drawer. The public storefront uses a thin header adapter around the same orange stagger-line menu primitive; it is not a second dashboard navigation tree.

### CommerceAdminNav package map

```text
CommerceAdminNav
├── shared nav model
│   └── apps/ecommerce-cms-agentsam/frontend/shell.js
├── desktop expanded rail
│   ├── white frosted left rail
│   ├── profile selector + logout footer
│   └── fixed click-controlled collapse toggle
├── desktop compact icon rail
│   ├── same nav items and active state
│   └── text-align trigger restores the expanded rail
├── tablet/mobile drawer
│   ├── same nav tree and footer
│   ├── left slide-in presentation
│   └── click-controlled hamburger/X state
├── shell styling
│   └── apps/ecommerce-cms-agentsam/frontend/static/css/console.css
├── served runtime mirror
│   └── dist/assets/admin/js/shell.js
└── public storefront adapter
    ├── public/js/store-shell.js
    └── public/css/store-shell.css
```

The dashboard does not mount `mobile-glass-drawer` as a competing package. The public adapter reuses the orange hamburger/X interaction and presents the storefront links in a compact glass drawer.

Catalog refresh uses small resumable requests, a single-writer lease, atomic per-product replacement, R2 storage for complete provider payloads, and visible pause/retry/error states. This is resumable request processing, not a durable background queue.

Public provider images use an origin allowlist, bounded Cloudflare transformations, edge caching, and original fallback. Originals remain available for production artwork. Customer artwork does not use the public catalog-image route.

Remaining acceptance work includes real provider-rendered artwork mockups, end-to-end product publishing and fulfillment, campaign automation, legal-page completeness, and a fresh-owner installation test.

## Packaging

Package identity: `apps/ecommerce-cms-agentsam`.

The app-local `bin/ecommerce.mjs` exposes `info`, `doctor`, `preview`, and `scaffold`. The manifest points the generic AgentSam app dispatcher to that executable. The SDK repository already contains an ecommerce preview app; its older “no bin” description is stale. Integrate through a reviewed source/host-adapter boundary instead of replacing its preview or copying installation credentials.

Scaffolds exclude credentials, local state, customer records, backups, and unrelated scripts. They neutralize deployment resource IDs and require each owner to provision D1, R2, KV, Vectorize, Stripe, Completeful, Resend, and AgentSam secrets. Doctor reports source readiness, not production readiness.

## Commercial offers

1. Developer edition: editable source and documented provider adapters.
2. Launch service: branding, resource provisioning, catalog setup, and verified checkout/fulfillment.
3. Managed operations: monitoring, updates, incident response, and agreed content/campaign assistance.

Price each offer against onboarding, support, provider, and AI costs. Do not sell unlimited operations before measuring them.

## Release gates

- A fresh owner can scaffold outside this repository without inherited credentials, account IDs, or customer data.
- `CommerceAdminNav` has one nav tree across expanded rail, compact icon rail, and tablet/mobile drawer presentations.
- The public header has one orange stagger-line hamburger/X control and a compact left glass drawer, without a dim fullscreen overlay.
- Catalog import completes, resumes after interruption, retries failures, and never exposes partial product snapshots.
- Images load at display sizes while originals remain available.
- Annotation sends only the selected context and comment, reports failures, and preserves retryability.
- Payments, publishing, fulfillment, and email have separate test and production acceptance records.
- Source commit, deployment version, and observed live behavior are recorded separately.
