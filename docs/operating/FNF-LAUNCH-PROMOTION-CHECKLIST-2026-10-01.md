## The promotion gate I would use

I would actually distinguish **“live”** from **“worthy of promoting.”** A site can technically take an order before I would spend money or deliberately drive a bunch of people into it. Based on the repo and ledger we just created, the declaration checklist should be:

- **CMS structural contract is real.** Add, duplicate, reorder, hide/remove and publish sections affect the actual public page; repeatable blocks do the same; reload/reopen preserves state; draft changes never leak to published state.
- **About is remastered into registered sections.** The useful old design/story work survives, but the giant one-off HTML is no longer the editing authority.
- **Community is remastered into real sections/data.** No unsupported `5K+`, `23`, `150+`, fake member stories or expired/demo events remain public; empty states are intentional when real content is absent.
- **Home, Shop, About, Community, Collaborate, Policies and Terms each have a distinct job.** No dead CTAs, legacy `/pages/...` assumptions or confusing duplicate page purpose.
- **Header/footer/navigation are one global contract.** Dark cinematic and frosted/light treatments become presets/variants rather than unrelated implementations; mobile navigation and cart state work everywhere.
- **Page Editor and Theme Editor are proven to share one CMS truth.** Switching Home → Shop → About → Community changes URL, preview, save endpoint and persistence correctly; no cross-page writes; the `/admin/store` hardcoded `?slug=shop` entry behavior is resolved.
- **Media library is the normal asset workflow.** Existing uploads can be searched, selected, multi-selected where appropriate, previewed/cropped, attached and reused without reuploading; original/derivative/usage relationships stay clear.
- **At least one real product is fully production-ready.** Real artwork, variants/options, pricing, imagery, product copy, provider mapping and sellability—not merely a catalog fixture.
- **Product → cart → payment → order is proven.** Variant selection, quantity, remove, discounts, shipping state, email validation, Stripe start, failed-payment recovery, successful payment and confirmation all work on desktop and mobile.
- **Fulfillment is proven for the chosen launch provider.** If Completeful is launch authority, the pending credential/first live sync is closed and one real product/order can be followed through mapping and fulfillment state.
- **The client can inspect an order after purchase.** Product/variant/quantity, totals, customer/contact, payment state, provider/fulfillment state and useful timeline are available; the current list-only/order-detail gap is closed enough for actual support.
- **Transactional confirmation exists.** Successful payment sends the intended customer confirmation; webhook retries do not duplicate it; failure paths do not send success mail.
- **Store controls tell the truth.** Password/B2B controls are either genuinely enforced or clearly unavailable/hidden; no UI control implies a capability that the storefront ignores.
- **Policies and identity are complete enough to transact.** Support contact, shipping, returns/refunds, privacy, terms and real business identity are coherent and reachable.
- **SEO/social is per-page rather than merely global.** Correct title, description, canonical, H1, indexability, OG/Twitter data, social image and internal links; social image actually loads externally; products expose truthful price/availability metadata.
- **Analytics never invents measurement.** The `[object Object]` Store metrics bug is gone; every metric has value/unit/source/as-of/coverage or an explicit unavailable state; no fake attribution.
- **Core admin is operable without engineering.** Products, inventory, orders, content/media, discounts, pages/theme, preferences and the minimum useful customer/subscriber operations work end-to-end.
- **Growth is either real or clearly prelaunch.** Campaigns have saved audience/channel/content/review state and actual attribution boundaries; cosmetic campaign fixtures do not masquerade as marketing infrastructure.
- **Markets/POS stay parked unless there is a real requirement.** They do not delay launch just because another commerce platform has those menu items.
- **Email scope is honest.** Gmail/multi-user inbox integrations are not sold as finished while Gmail OAuth/provider-sync/ownership rules remain unwired; transactional mail needed for commerce is handled separately first.
- **Mobile gets its own QA pass.** Major public pages, product selection, cart/checkout, menus, CMS preview, forms and admin workflows used by the client are usable at narrow widths.
- **Accessibility fundamentals pass.** Keyboard/focus, headings, labels, alt text, contrast, touch targets, reduced motion and validation/error communication.
- **Performance/media pass.** Hero/media dimensions, image sizes, video behavior, fonts, layout shift, cache behavior and unnecessary JS are checked on realistic mobile networking.
- **404/500/empty/loading/error states are intentional.** Especially product absence, no events, no gallery assets, failed provider sync, failed checkout and unavailable analytics.
- **Production deploy has rollback evidence.** Known build command, current revision/version, health check, smoke tests, and a known rollback path.
- **No P0 or P1 audit item remains open without an explicit launch exception.** Every closed item has proof—not “agent says fixed.”
- **Promotion-ready content exists beyond one hero.** At minimum there is a strong Home, real Shop inventory, convincing About, honest Community state, usable social previews, signup destination and enough real media that new traffic does not hit obvious scaffolding.
- **A full stranger test passes.** Someone with no project context can arrive, understand the brand, find something real, trust it, buy it, receive confirmation and know how to contact the business—without encountering an obviously fake/demo/admin-generated experience.

## Work log — 2026-10-01

- **IN PROGRESS — CMS structural contract.** Home composition now projects the published CMS section order/instances onto registered preset renderers instead of rendering preset order as storefront truth.
- **PROVEN — duplicate/order/visibility projection.** Dynamic section instances resolve through persisted `__editor.templateKey`; hidden instances are omitted; CMS `sort_order` is authoritative for composed Home sections.
- **PROVEN — registry/preset drift guard.** A test now requires the Home editor registry and Home preset composer to expose the same section template keys.
- **RETIRED — stale `comingSoon` editor template.** The registry no longer offers the obsolete 2025 first-drop section. Existing published legacy rows are ignored with a browser diagnostic until production CMS data is republished/cleaned.
- **STILL OPEN — full gate.** Repeatable blocks must become renderer-authoritative, About/Community still need section-family remastering, and the remaining commerce/media/order/promotion checks below are not yet declared complete.
