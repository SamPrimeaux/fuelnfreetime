# Compatibility feature manifests

This directory remains readable while the Ecommerce app is refactored toward clearer ownership.

Canonical ownership now follows the thing being described:

- Core Ecommerce admin frontend -> apps/ecommerce-cms-agentsam/frontend/admin.surface.json
- Bundled Ecommerce Apps -> apps/ecommerce-cms-agentsam/apps/*/agentsam.app.json
- Extracted/shared package features -> live with their package (for example packages/agentsam-workbench/agentsam.feature.json)

The manifests in this root features/ directory are compatibility bridges for older discovery flows. Do not add new Ecommerce Apps here. New App contracts belong under apps/ecommerce-cms-agentsam/apps/; new package-scoped features belong with the package that owns them.

Current bundled Ecommerce Apps:
- Product Studio
- Growth
- Completeful
- Resend / Email

admin-mobile-dock remains a shared UI/package feature while its reusable package contract is retained separately.
