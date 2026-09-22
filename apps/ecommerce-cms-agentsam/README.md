# AgentSam Ecommerce + CMS

Fuel & Free Time is the working reference installation. This app owns the shared navigation renderer and contextual inspector. React mounts content through a portal into the same shell used by CMS, product editor and media pages. The public shell and inspector are generated mirrors.

App-local commands:

    node apps/ecommerce-cms-agentsam/bin/ecommerce.mjs info
    node apps/ecommerce-cms-agentsam/bin/ecommerce.mjs doctor
    node apps/ecommerce-cms-agentsam/bin/ecommerce.mjs preview
    node apps/ecommerce-cms-agentsam/bin/ecommerce.mjs scaffold /outside/empty-directory

The package exposes the top-level ecommerce executable when installed or linked. SDK registration uses agentsam.app.json and its bin. The SDK app already has a separate preview executable; do not blindly replace its host adapter. This workspace-source package must travel with its runtime source to scaffold.

Scaffolds exclude credentials, local state, customer seeds and unrelated scripts. They retain sample storefront branding. Each owner provisions resources and provider accounts. Doctor checks source presence, not deployment readiness. See ecommerce-cms-agentsam.md for release gates.
