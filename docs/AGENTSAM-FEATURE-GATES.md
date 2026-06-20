# AgentSam feature gates — Fuel n Freetime

Advanced capabilities are **disabled by default** for `ws_fuelnfreetime` until the customer approves a paid advanced scope.

## Disabled for FNF

| Feature | Status | Reason |
|---------|--------|--------|
| Web search | Off | Advanced/paid — can enable after approval |
| Deep research | Off | Advanced/paid — can enable after approval |
| PDF extraction | Off | Advanced/paid — can enable after approval |

Configuration: `src/agentsam/feature-gates.js` → `FNF_AGENT_FEATURES`.

## Enabled for FNF

- Image / file upload (png, jpeg, webp, gif, txt, md, csv, json)
- Image generation / Creative Studio
- GitHub repo tools (`SamPrimeaux/fuelnfreetime`)
- Inner Animal MCP bridge
- Store / CMS / D1 / R2 scoped tools
- Content, brand, and code workflows

## Safe alternatives

When a disabled feature is requested, AgentSam should:

- Ask the user to **paste text** or **upload an image**
- Offer to **write a research brief** without live web lookup
- Use **repo / store / CMS tools** when relevant

## UI

The `+` menu shows only:

- Add photos & files
- Create image
- Connections (Inner Animal MCP, GitHub)

Web search, deep research, and PDF extraction are **hidden** (not shown as coming soon).

## D1 patch

```bash
npm run db:patch:agentsam-disable-research-tools
```

## Enabling later

Set flags in `FNF_AGENT_FEATURES` to `true`, re-seed/activate tools in `agentsam_tools`, and redeploy.
