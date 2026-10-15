# FNF cart drawer and checkout / 2026-10-15

**Branch:** feat/storefront-cart-drawer-20261015

- Shared StorefrontCart contract (TS) plus pure model; one existing `fnf_cart` store, no shadow basket. FNF_STORE compatibility adapter used in the FNF theme. Quantity math, variant IDs, sale prices remain attached to stored lines.
- Global header cart opens an accessible right-side drawer (overlay, modal focus, Escape, quantities, remove, subtotal, route to /checkout). Mobile version is full width. Product Add to bag opens the drawer.
- Canonical /checkout reuses the current proven checkout implementation. /cart remains compatibility alias. Cancellation returns to /checkout.
- Sitewide CMS global footer mounted on checkout. Header font explicitly inherits Inter; no additional independent header implementation.
- Removed unsupported hard-coded shipping progress ($75) and processor promotional wording from checkout.
- Completeful catalog color references now expose multiple existing provider mockup views per color. Selecting a color never mixes in artwork assigned to another color. Provider references remain labeled and distinct from decorated merchant media.
- Live D1 read-only provider metadata: product 12 has 30 references for 15 colors; product 10 has 12 references for six colors. No media generation, price, inventory or order writes.

**Verification:** 22 focused commerce, PDP, supplier handoff and footer tests pass. Standalone TS contract check passes. Production frontend TypeScript/Vite build, asset assembly, package authority and boundary checks pass. Chrome 390/1440 used real product fixture: drawer open/close, quantity 1→2, $69.98 subtotal, checkout handoff, global footer, restored Inter header, no document overflow. No checkout session or payment was initiated. Existing `tests/store-search-discovery.test.mjs` timestamp assertion fails identically on untouched main; out of scope.

**Release policy:** owner review PR; do not fabricate checkout, inventory, supplier stock or mockups.
