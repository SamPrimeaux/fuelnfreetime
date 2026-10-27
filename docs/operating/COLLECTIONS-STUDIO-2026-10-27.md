# Collections Studio — React/TypeScript implementation

Status: **implemented in the Fuel N Free Time source**, migration and remote deployment
pending. This document describes the existing workstream, not a second app.

## Ownership

- `apps/ecommerce-cms-agentsam/frontend/src/pages/collections/`: dedicated
  library, editor, media/product pickers, assortment planning, presentation
  preview, membership rules, SEO, and publishing UI.
- `apps/ecommerce-cms-agentsam/backend/lib/route-manifest.js`: canonical
  `/admin/collections`, `/admin/collections/new`, `/admin/collections/:collectionId`
  routes (React SPA). The old `/admin/collections.html` redirects.
- `apps/ecommerce-cms-agentsam/backend/admin/api.js`: existing collection and
  product-assignment APIs, plus `PUT /api/admin/collections/:id/rules`.
- `apps/ecommerce-cms-agentsam/backend/store/collections.js`: published
  catalog selection, stable manual order, automatic/hybrid membership.
- `packages/agentsam-merch/`: provider-neutral portable planning, normalized
  membership rule resolver, hero renderer and collection showcase. These same
  primitives are also implemented upstream in
  `~/agentsam-sdk/packages/agentsam-merch`; the SDK is the intended package
  authority. FNF's local source is its independently buildable integration
  snapshot, **not another feature to develop separately**.
- `packages/heuristic-theme/storefront/collection.html` and
  `js/store-collections.js`: use the *same compiled merch hero and showcase*
  as the editor's preview. No generated garment images are substituted for real
  catalog images.
- Shell/dock remain in existing ecommerce app shell and the existing
  `admin-dock` package. There is no second application-level shell.

## Collection creation flow

1. Create a draft collection; enter title and select real media.
2. Assign actual catalog products or plan manufacturer blanks using shared
   assortment recipes and Completeful search.
3. Product Studio receives the collection ID when opening a product. The
   product is prepared/published there before becoming saleable.
4. Set presentation preset and actual product gallery; desktop/mobile previews
   use the shared storefront renderers.
5. Optionally configure manual/automatic/hybrid membership and exclusions.
6. Save, then publish when at least one actual published catalog product is
   present. The application saves a new collection as a draft before membership
   and rules are written, then publishes after succeeding.

The admin UI shows a preview of resolved public products; source/print artwork
and manufacturer assets are not replaced by presentation thumbnails. A missing
product image stays explicitly missing, not synthetic.

## Existing database compatibility

Continue using `store_collections` and `store_collection_products` for
collection records and manually ordered membership. The additive migration
`db/migrate-store-collection-rules-20261027.sql` creates
`store_collection_rules` and supports automatic/hybrid rules. Existing
collections remain manual if this table is not present. **Apply the migration
before deploying an app release that enables editing nonmanual rules.**

### Release commands (run when authorized)

```bash
# From ~/fuelnfreetime, verify sources and packaged static outputs:
npm run build:admin
node --test tests/{admin-storefront-collections-manager,storefront-collections,merch-hero-generator,collection-builder-migration,collection-planning-sdk,collection-rules-api,collection-showcase,collections-react-boundary,admin-dock}.test.mjs

# Additive production database migration (not executed in this implementation):
npm run db:migrate:collection-rules

# Deploy with the existing checked/authorized deployment process after migration.
```

The TypeScript frontend's new Collections subtree passes ESLint; the full
frontend still has older Product Studio lint findings unrelated to this change.

## Boundaries / follow-ups

- The UI no longer requires raw image/CTA URLs. Existing database columns
  remain URL-compatible for the current storefront; a future media-asset ID
  migration may replace these compatibility columns once storefront and media
  identity contracts are updated together.
- User-facing product closeups and rear views require verified images from the
  product's media pipeline; this studio does not synthesize missing imagery.
- D1 collection metadata, membership, and rules are currently saved through
  existing sequential APIs. The editor clearly reports partial-save failures.
  A future single transactional mutation endpoint can eliminate that window.
- Automatic rules match title, slug, and legacy collection label; broader tag,
  inventory, and variant predicates require typed catalog schema extensions.
- Do not blanket-version all SDK packages for this change. Publish the
  independently changed merch package on its own release track.
