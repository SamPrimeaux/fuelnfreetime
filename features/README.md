# Fuel & Free Time — feature capsules

Incubating `agentsam.feature.v1` manifests for behavior already built in this repo.

Schema SSOT: `agentsam-sdk/protocol/features/agentsam.feature.v1.schema.json`

| Feature | Kind | Status |
|---------|------|--------|
| provider.resend | provider | incubating |
| provider.completeful | provider | extracted (`@inneranimalmedia/agentsam-provider-completeful`) |
| admin.shell-nav | ui | incubating |
| agentsam.mini-composer | composer | extracted (package) |
| growth.campaigns | domain | incubating |
| commerce.product-studio | domain | incubating · requires `commerce.catalog` |

Host APP: `../.agentsam/app.json`  
Ecommerce APP: `../apps/ecommerce-cms-agentsam/.agentsam/app.json`

**Law:** npm/package install is inert. AgentSam activates after plan + approval.

Product Studio consumes `agentsam.commerce.catalog.v1` (`catalog_product_id` / `catalog_variant_id`). Completeful provider ids stay adapter aliases.
