# FNF: Aviation review, Store Preferences and protection roadmap

**October 6, 2026 — implementation and release checklist.**

## Real artifact, not fabricated helicopter footage

The existing R2 bridge-fly artifact is a working **Golden Gate Bridge flyover**, not a helicopter or restoration scene. Its camera and controls are candidates for a real FNF project experience featuring the ongoing helicopter restoration. Retain the original source unchanged. Potential future chapters require real build milestones, verified photographs and aircraft media, contributor credits, and an accessible optional 3D component.

The actual CMS Bridge Fly page now has an authenticated scene-preview canvas instead of an empty "no storefront route" message. It is **source preview only**; its Publish control is disabled pending a proven storefront rendering contract. The existing Aviation Scene Lab owns its evaluation notes and reviewer-link settings, not an additional editing engine.

The old admin/revise-atlas route redirects to the canonical Theme Editor Add Section catalog, filtered to the Revise section family. The 24 source-backed Revise Atlas presets remain registered; the old demonstration asset is retained as a test fixture for now, not as an advertised merchant editor.

## Password-protected owner review

- The existing FNF admin session protects GET/POST /api/admin/scene-review.
- Separate owner-configured reviewer settings are saved in the existing D1 store_settings JSON, not on a new platform or database.
- Reviewer passwords require 12–128 characters and are stored using the existing salted PBKDF2 hash helper. Secrets are removed from the public Store Preferences API.
- On successful guest verification, the Worker creates a two-hour Secure, HttpOnly, SameSite=Lax review cookie, signed with HMAC over the access state. Disabling or changing access invalidates previously issued cookies.
- The review entrance and same-origin scene R2 proxy both check this cookie, add no-store/noindex headers, and use a best-effort KV attempt counter. Review access is disabled by default.
- Scene Lab provides a native Share icon, clipboard fallback and separate password setting. The URL never contains the password.
- The reviewer sees what the original prototype does and concrete evaluation questions, not fictional helicopter capabilities or an arbitrary promo.

**Critical privacy limitation:** These same original files are still publicly accessible at the old assets.fuelnfreetime.com R2 custom domain. A password gate over the reviewer and its proxy does not close those legacy URLs. The API explicitly reports assetPrivacyReady=false. **Do not describe the original scene contents as confidential** until both original public hostnames and old URLs are blocked, or the scene is moved to genuinely private storage with all public copies retired after a checked backup. Add a Cloudflare edge rate-limit rule, because KV counters are not atomic.

## Store Preferences: what is now real

The logo and social image controls use the existing authenticated media library and upload endpoint. Customers choose an existing logo, icon or sharing artwork visually; they do not need to find R2 keys or URLs. Advanced URLs are collapsed rather than removed from the underlying contract.

The home SEO fields already feed the Worker HTMLRewriter; this branch resolves relative R2 media paths to absolute URLs in OpenGraph and Twitter metadata, and keeps the social preview synchronized. Confirm this with external crawlers after publication.

The site navigation remains a single ordered header/footer route list. Labels and destinations are first-class GUI controls; prefix matching is advanced.

The Announcement section now has a visual preview and supports fixed or looping text, editable message/link and validated six-digit background/foreground colors. The previously missing public navigation-resolver fields are restored. Storefront marquee rendering is CSS-based with reduced-motion fallback. These changes do not modify the original Heuristic theme visuals when announcements are disabled.

## Fraud/security capability audit

### Storewide password

The previous code had salted password save and verification helpers, but the public storefront routing did not call the verifier. The UI switch was not a reliable access gate. This branch explicitly marks that switch unavailable; it is **not** the separately functional scene reviewer.

Completion requires server-side enforcement on the intended HTML/API/media routes, explicit checkout/webhook/SEO exemptions, short-lived secure guest sessions, WAF limits and cross-device browser tests. Never enable it by silently toggling an existing field.

### Spam verification

The hCaptcha flags were only saved preference booleans; no actual hCaptcha verification was located on the referenced FNF contact/account routes. They are shown disabled rather than pretending the site is protected.

Implement a provider-neutral challenge verifier with **Cloudflare Turnstile** as a likely FNF adapter. Inventory real protected forms first: newsletter, contact, login, signup, reset, comments and community submissions. Only enable a toggle when a valid site key, Worker-only secret, frontend challenge widget, and backend siteverify request are installed on that route. Validate hostname/action, expiration and replay. Provide accessible/error fallbacks, edge abuse limits, real audit events and invalid-token tests. Avoid accidental restrictions on checkout and existing customers.

### Crawler access and public discovery

FNF does not issue crawler credentials, implement request signatures, or own a crawl queue. Public search discovery is provided by the storefront's `robots.txt` and `sitemap.xml` endpoints, plus canonical metadata and real HTML. The reusable `site.scrape` capability in `SamPrimeaux/agentsam-sdk` is the crawler authority. FNF Preferences reports public URL counts and does not imply that refreshing the panel starts a crawl.

The SDK package is not present as a runtime binding or callable API in this FNF checkout; do not invent an invocation protocol. A real crawl action/run-history integration needs a documented SDK runtime contract and shared run receipts first. Crawler execution, authorization, host scheduling, fetch history and evidence remain with the shared AgentSam platform. Do not add FNF-specific signatures, credentials, nonces, crawler audit logs, or D1 crawler tables. See [`FNF-SITE-SCRAPE-BOUNDARY.md`](FNF-SITE-SCRAPE-BOUNDARY.md).

## Ownership and portability

FNF has its own Worker, D1 and R2. Current configuration remains isolated to that installation, with the existing admin session boundary. No generic shared multi-tenant database or new editor is introduced. No new D1 schema migration is needed for these preference and review controls.

## Acceptance

- Full admin build, sync and repository boundaries.
- Scene reviewer contract tests: off by default, strong password, separate hashed settings, signed/rotating cookie, R2 proxy authentication, storefront unchanged.
- Real Chrome merchant Preferences test at 390, 744 and 1440px: media library selection, SEO/logo artwork, fixed vs marquee preview, persisted save payload, no overflow.
- Source/portable section regression tests, authentic Bridge Fly editor preview and Revise catalog deep link.
- After review, merge/deploy safely; then authenticated CMS save/reload and guest review with a password in a separate session.
- **Do not claim the original scene is confidential while its old public R2 URLs remain accessible.**

Asset-privacy migration, spam verification, a callable shared SDK crawler integration, and true storewide password protection remain tracked work; the Preferences discovery panel does not imply these capabilities are shipped.
