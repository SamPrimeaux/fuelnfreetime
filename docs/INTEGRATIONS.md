# Known integrations and reusable products

This inventory records implemented boundaries. Runtime readiness still comes
from the relevant contract, bindings, credentials, and health checks.

| Capability | Canonical source | Current boundary |
| --- | --- | --- |
| Completeful | `backend/completeful/` and `backend/webhooks/completeful.js` | Custom provider catalog, image, fulfillment, and webhook integration. Provider merchandise is excluded from `agentsam_products`. |
| Resend email | `backend/store/order-email.js` and `backend/admin/mail.js` | Custom-domain transactional and admin mail implementation. |
| GitHub OAuth | `backend/admin/agentsam-github.js` | Repository-scoped OAuth connection for AgentSam tools. |
| Multi-user admin | `backend/lib/auth.js` | Account, role, and session authority for the commerce dashboard. |
| Workers AI | `backend/agentsam/ai-run.js` | Cloudflare Workers AI execution adapter. |
| AI provider routing | `backend/agentsam/ai-registry.js` | D1-backed model and provider selection across configured AI APIs. |

The source-verified product manifests are `catalog-products.json` for this
repository and `catalog-products.agentsam-sdk.json` for the sibling
`agentsam-sdk` checkout. `scripts/register-catalog.mjs` resolves the repository
record from each checkout's Git remote; repository IDs are never embedded in
the manifests.
