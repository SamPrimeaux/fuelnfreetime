---
name: On-Brand GenMedia - Fuel & Free Time
description: Fuel & Free Time brand-aware visual generation and product mockup workflow. Use for generated product art, banners, campaign creative, social media, product mockups, image review, and media that must follow the F&FT brand dossier.
skill_domain: media
task_types: image_generation,image_to_text,brand_design,content_generation,commerce
access_mode: read_write
slash_trigger: genmedia
sort_order: 4
globs: docs/brand/**,app/backend/agentsam/**,src/admin/media.js,src/completeful/**,src/admin/completeful.js
---

# On-Brand GenMedia - Fuel & Free Time

This skill is owned by Fuel & Free Time and scoped to `ws_fuelnfreetime`. Do not substitute Inner Animal Media brand/storage/vector lanes.

## Runtime authority

Use the deployed F&FT Worker contract:

- `DB` -> D1 `fuelnfreetime` (`9fd6ff92-e407-4b51-8b01-3c93f3845bb2`)
- `AGENTSAM_WAI` -> Workers AI
- `FNF_VECTORIZE` -> `fnf-agentsam-bge-m3-1024`
- `WEBSITE_ASSETS` -> R2 bucket `fuelnfreetime`
- `CMS_CACHE` -> F&FT CMS cache
- `CMS_EDITOR` -> `CmsEditorRoom`
- `ASSETS` -> static Worker assets
- `OPENAI_API_KEY` -> server-side OpenAI provider secret

Canonical config: `wrangler.toml`.

Do not reference IAM-only `AGENTSAM_VECTORIZE_DOCUMENTS`, `AGENTSAM_VECTORIZE_MEMORY`, IAM `agent-sam` R2, or IAM-only image/spawn tables.

## Existing workflow: fnf_creative_studio

Do not invent a parallel spawn loop. The live F&FT workflow is:

1. `fnf.capture_creative_brief`
2. `fnf.load_visual_context`
3. `fnf.plan_creative`
4. `fnf.generate_creative`
5. `fnf.approval_creative` when a live asset replacement is requested
6. `fnf.verify_creative`
7. `fnf.present_creative`
8. `fnf.write_memory`

The workflow default task type is `image_generation`.

Current audit note: the workflow node handler keys are present in `agentsam_workflow_nodes`, but most are not yet normalized as individual `agentsam_tools` rows. Treat them as workflow implementation hooks, not proof of separate callable tools.

## Brand context

Canonical brand document:

- `docs/brand/business-brand-dossier.md`

Before generation:

1. Retrieve relevant brand context through `fnf_semantic_search` using `source_type=brand` when available.
2. Retrieve product context with `source_type=product` for product-specific creative.
3. Read the exact dossier section when repo access is available.
4. Load existing media/product images from `media_assets` / `product_images`.
5. Never use `CMS_CACHE` as the source of truth for brand decisions.

## Image generation

Route visual generation through the AgentSam AI runtime with:

- `task_type = image_generation`
- workflow `fnf_creative_studio`
- brand/product context included in the system/user prompt

The model registry already contains active image lanes including FLUX, Leonardo, and inpainting models. The current `app/backend/agentsam/ai-run.js` image-generation executor also has a server-side OpenAI path using `OPENAI_API_KEY`.

Important runtime truth:

- Do not hard-code a model in this skill.
- Select by `task_type=image_generation` and let the runtime registry/dispatcher own model routing.
- Current audit found that the image-generation executor presently sends the generation request to OpenAI `gpt-image-2` even when a Workers AI image model row was selected. That is a dispatcher normalization issue, not a missing-capability issue.
- Vision/review uses the `image_to_text` lane through `AGENTSAM_WAI`.

## Creative brief contract

Before generating, normalize the request into:

- objective
- audience
- channel/placement
- product or subject
- required copy
- palette/material cues
- composition/layout
- typography behavior
- mood
- required brand elements
- avoid-list
- dimensions/aspect ratio
- product-truth constraints
- accessibility/readability constraints

For product imagery, never invent product features, colors, materials, variants, or dimensions that conflict with local product/catalog data.

## Persist generated media

Generated images must become real F&FT media assets before downstream Completeful use.

Use the existing media library:

- R2 binding: `WEBSITE_ASSETS`
- D1 table: `media_assets`
- public route: `/media/{r2_key}`
- canonical public URL for provider calls: `https://fuelnfreetime.com/media/{r2_key}`

Stage generated creative under an appropriate R2 prefix and register the asset in `media_assets`.

Do not replace a primary product image, homepage hero, or campaign asset without the workflow approval gate.

## Completeful design + mockup bridge

For product-ready creative, Completeful is the downstream placement/render/export system.

Provider base:

`https://vxapi.completeful.com/v1`

Use the Worker-side `CAPP_KEY`; never expose it to browser code.

### Design creation

Create a Completeful design with `POST /v1/designs`.

Useful fields include:

- `name`
- `artfile_url` or `image_url` -> public F&FT media URL
- `canvas_json`
- `shop_id`
- `collection`
- `tags`
- `width` / `height`
- personalization fields when applicable

Use `Idempotency-Key` for create/action calls.

### Design export

Use:

- `POST /v1/designs/{designId}/exports`
- `GET /v1/designs/exports/{exportId}`

Supported export intent includes JSON/PNG/JPEG/SVG according to the provider contract.

### Catalog placement

Resolve the provider product before rendering:

- `GET /v1/catalog/products/{productId}/print-locations`
- `GET /v1/catalog/products/{productId}/mockups`
- `GET /v1/catalog/products/{productId}/assets`
- `GET /v1/catalog/products/by-sku/{sku}`

### Mockup render

Use `POST /v1/mockups/renders` with:

- `mockup_id`
- `art_url` -> public F&FT media URL
- `output.format`
- `output.max_size`
- `output.clip_to_print_area`

A render may return immediately or queue. Poll:

`GET /v1/mockups/renders/{renderId}`

This is product mockup/rendering, not the upstream generative model itself.

## Review loop

After generation/render:

1. Run image review through the active `image_to_text` model lane.
2. Compare against the brand dossier and product truth.
3. Check composition, logo treatment, copy legibility, product fidelity, dimensions, and channel fit.
4. Iterate the generation only when the feedback is actionable.
5. Store the approved asset key and relevant design/mockup IDs for reuse.

## Safety and authority boundaries

- F&FT D1 remains authority for local product identity, retail pricing, orders, and storefront state.
- Completeful supplies provider catalog/design/mockup/fulfillment state.
- Never place secret values in D1 rows, prompts, R2 metadata, or generated files.
- Never use `CMS_EDITOR` as generic image-job state.
- Never create a new Durable Object just for this workflow.
- Never treat a provider mockup as a live storefront image until explicitly approved.

## Verification

```sql
SELECT id, provider, model_id, display_name, task_type, lane, status
FROM agentsam_ai
WHERE task_type IN ('image_generation','image_to_text')
ORDER BY task_type, priority;
```

```sql
SELECT workflow_key, default_task_type, is_active
FROM agentsam_workflows
WHERE workflow_key = 'fnf_creative_studio';
```

```sql
SELECT id, slug, file_path, retrieval_strategy, version, is_active
FROM agentsam_skill
WHERE slug = 'on_brand_genmedia';
```

Expected skill object:

`r2://fuelnfreetime/agentsam/skills/on_brand_genmedia/SKILL.md`
