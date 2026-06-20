# Page Upload Guide

`index.html`, `shop.html`, `about.html`, and `community.html` here are the
**original raw exports** — kept as a reference snapshot only. The live,
served versions of these same four pages now live in `/public` (wired up
via the Workers Static Assets binding) and are the ones that actually
deploy.

## If a page changes upstream

Same convention as before: drop the new raw export into `legacy/<slug>.html`
exactly as exported, tell me what changed, and I'll carry the relevant
edits into `public/<slug>.html` (which may have small additions on top —
e.g. the shared newsletter handler script tag — so it's not always a
straight copy-over).

## Pages not yet covered

Cart, checkout, product detail, account/login, contact — none of these
exist yet, raw or rebuilt. Drop raw exports in here the same way
(`legacy/cart.html`, `legacy/product-detail.html`, etc.) whenever they're
ready to start.
