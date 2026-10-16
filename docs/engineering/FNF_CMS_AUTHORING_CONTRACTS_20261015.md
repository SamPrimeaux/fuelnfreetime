# FuelNFreetime: CMS authoring contract bridge, not another editor

This checkpoint targets the existing \`apps/ecommerce-cms-agentsam\` application.
The visible Theme Studio stays as it is. There are **no** additional preview
editors, catalogs, alternate pages, tables, R2 objects, D1 writes, migrations,
or publication operations in this change.

## Real source path

1. \`backend/cms/api.js\`: the admin registry route already calls
   \`listCmsDefinitions(env, accountId)\` and \`attachCmsDefinitions(...)\`.
2. \`backend/cms/definition-registry.mjs\`: reads account-scoped
   \`cms_definitions\`, optionally linked to ready \`cms_artifacts\`.
3. \`backend/cms/setting-contract.ts\`: normalizes declarative definition
   settings while preserving help text, groups, defaults, bounds, options,
   visibility conditions, token metadata and diagnostics. Unsupported field
   types do not quietly become plain text inputs.
4. Existing \`frontend/static/js/theme-editor.js\` consumes that registry,
   selects real block metadata by instance ID/template key and renders the
   inspector. It has not been copied, themed or redesigned.

The D1 section *and block* definitions now get distinct lookup indexes. An
active block definition only enhances a **pre-existing native renderer-backed
block template** with the same key and compatible field names/types.
Unmatched keys and type disagreements are surfaced as \`schemaConflicts\`;
the existing renderer controls are preserved. This is not permission to
invent blocks or assert unknown JavaScript is renderable.

The inspector already has controls for several native fields. This bridge
preserves typed metadata but does **not** claim that the UI already implements
all guide-proposed types (for example dynamic bindings or conditional input
visibility) or that D1 mutations now validate every such field.

## Source inventory / known gaps

- \`backend/cms/registry.js\` still owns legacy page/section default and
  template compatibility data. \`api.js\` still reads it for initial seeding,
  page discovery and section insertion. **Do not delete it until the
  persisted-page/definition migrations and renderer bindings are verified.**
- Home Hero still has flat CTA label/path properties. This patch does not
  convert them to \`cms_section_blocks\` records or claim that such blocks
  already exist in D1.
- \`cms_section_blocks\` already declares \`parent_block_id\`, \`sort_order\`,
  \`block_type\` and \`content_json\`. Actual deployed D1 migration state
  and populated content were not checked; this is a source-level bridge.
- Future worker-side settings validation, typed page/media references,
  instance CRUD, save/reload/undo, global Header/Footer authority, R2
  publishing and second-tenant tests remain release gates.

## Verification

\`node --test apps/ecommerce-cms-agentsam/tests/cms-setting-contract.test.mjs\`
checks schema normalization, incompatible definitions, existing button fields,
safe block attachment, original source preservation and the section/block
inspector boundary.

Run the existing Theme Studio behavior tests alongside this test. No live
Cloudflare deploy or merchant D1/R2 change should happen from this branch.

## TypeScript compilation and remaining UI boundary

The authoritative normalization code is TypeScript, typechecked by
\`tsconfig.cms.json\` during the repository's production
\`guard:boundaries\` command. It is imported into the Worker backend via
Wrangler's TypeScript-aware bundler and directly by the current Node 22
test runner. No untyped duplicate implementation is maintained.

The real Theme Studio frontend still contains legacy JavaScript and is NOT
now a React/TSX editor. Convert the existing editor incrementally with
behavior parity tests and keep the same HTML/CSS/interaction surface;
do not fork or replace it with a second editor.

A fully typed contract is necessary but not sufficient: production D1
CRUD/save/reopen, shared resource pickers, global Header/Footer instance
authority and database-side validation are separate acceptance gates.


## TypeScript migration execution gates (checked 2026-10-15)

Strict typecheck: tsconfig.cms.json. Both the isolated application build and the root guard invoke verify:cms (TypeScript compilation plus runtime contract tests). The Worker dry-run successfully bundled the TypeScript module with generated assets. No deployment was performed. The 69 focused CMS/editor tests passed. This is a typed contract foundation, not completion of the TSX Theme Studio or persistent section/block CRUD.
