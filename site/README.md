# Site installations

Everything specific to a customer's storefront lives here, not in a published package.

    site/<customer>/site.json     assets, navigation, newsletter wiring, real logo and model URLs
    site/<customer>/migration/    one-time migration evidence (old-site link audits, notes)

Published packages (`packages/*`, `@inneranimalmedia/*`) ship the engine and stock demo content only.
`npm run check:publish` fails if a package tarball contains a customer name, domain or asset ID
(patterns live in `publish-denylist.json`). The stock theme name `fnf` is fine to ship; customer identity is not.
