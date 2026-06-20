# Page Upload Guide

This repo separates **raw reference HTML** from the **remastered build**. Drop original
pages into `legacy/` exactly as exported — don't clean them up first. I'll handle the
remaster from there.

## Where to drop each page

Use the same slug as the current live path on
`fuelnfreetime.meauxbility.workers.dev`, saved into `legacy/`:

| Live page | Drop as |
|---|---|
| `/` (homepage) | `legacy/index.html` |
| `/shop.html` | `legacy/shop.html` |
| `/about.html` | `legacy/about.html` |
| `/community.html` | `legacy/community.html` |

If there are pages not listed above and not currently live — cart, checkout, product
detail, account/login, collection pages, contact, privacy — drop those in too, named
for what they are (e.g. `legacy/cart.html`, `legacy/product-detail.html`,
`legacy/account-login.html`). Same rule: paste the file as-is, slug names it.

Paste the raw HTML content directly in chat (or upload the file) and I'll push it into
`legacy/<slug>.html` myself — no need to touch the repo by hand.

## What happens after a page lands in legacy/

Each `legacy/<slug>.html` gets remastered into:

- `static/pages/<slug>/` — the rebuilt markup/fragments for that page
- `src/api/render_<slug>.js` — the Worker route that serves it, pulling content from
  `DB` (D1) and assets from `WEBSITE_ASSETS` (R2) instead of hardcoded Shopify CDN
  links
- relevant rows in `db/schema.sql` / `db/seed.sql` if the page needs CMS-editable
  content or product data

`legacy/` itself never gets deployed — it's reference only, kept around so we can diff
against the original copy/layout if something looks off mid-rebuild.

## Ecommerce data model (once pages start landing)

Products, variants, cart, and orders will live in D1 under `db/schema.sql`. Until the
first product/shop page shows up, no ecommerce tables exist yet — built incrementally
per page rather than all upfront.
