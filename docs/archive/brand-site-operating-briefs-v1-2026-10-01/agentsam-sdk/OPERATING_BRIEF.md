# AgentSam SDK — Operating Brief v1

## 0. Run mode

**REMASTER + PRODUCTIZATION**

The current public story is useful, but the product needs a clearer umbrella narrative so the SDK is
not accidentally reduced to “cloud sandboxes.” Themes/examples also need to read as reusable product
surfaces rather than a gallery of client websites.

## 1. Outcome contract

### Brand in one sentence — PROPOSED
**AgentSam is an installable agent toolkit and runtime layer for giving applications portable tools,
structured decisions, machine/runtime access, controlled execution, and observable paths from plan
to verified result.**

### Current public proof — CONFIRMED
The current homepage presents `@inneranimalmedia/agentsam-sdk` as an installable package and emphasizes
ephemeral sandboxes, scoped tools/credentials, parallel workers, resumable sessions, observability,
approval gates, and promote-only paths.

### Primary audiences — PROPOSED
1. Developers embedding agent capabilities into their own products.
2. Operators who want agents to work across local and cloud execution lanes without rebuilding the
   runtime for every app.
3. Builders installing AgentSam-packaged applications/tools who should not need InnerAnimalMedia-specific
   infrastructure to use them.

### Website job — PROPOSED
Explain the system quickly, prove it with real contracts/receipts/examples, get a developer to a useful
first run, and then route them to the right depth of documentation.

### Primary action
**Install / run the SDK quickstart.**

### Secondary actions
Read the mental model; explore structured decisions; connect a native runtime; follow infrastructure
recipes; learn the old-school agent concepts; inspect packaged themes/apps.

### 5–10 second comprehension target
A visitor should understand:

> AgentSam is portable agent machinery you install and compose — not a web agency, not a single hosted
> chatbot, and not only a sandbox service.

## 2. Truth and decision model

### CONFIRMED
- Public package identity: `@inneranimalmedia/agentsam-sdk`.
- The public site currently foregrounds isolated execution, scoped access, resumable sessions,
  observability, and human approval.
- Docs surfaces exist for Sam, structured decisions, native runtime, infrastructure cookbooks,
  Learn, SDK Help, and Themes.

### PROPOSED
- Make **portable agent machinery** the umbrella message.
- Make sandboxes one execution lane/capability beneath that umbrella.
- Use real receipts/contracts/examples as proof instead of broad AI claims.
- Treat packaged apps and themes as installable/reusable products with explicit boundaries.

### PARK / DO NOT CONFUSE WITH CURRENT PRODUCT
- Customer-specific websites as “themes.”
- InnerAnimalMedia identity or infrastructure as a required bottleneck for random SDK users.
- Brand-specific client code inside reusable packages.

## 3. Messaging hierarchy

### Primary message — PROPOSED
**Give your agent real tools, real runtime choices, and a verifiable path from decision to result.**

### Supporting messages
- Installable SDK, not another bespoke agent stack.
- Local, remote, and sandbox execution can share a consistent contract.
- Deterministic machinery should do deterministic work; models are one component.
- Tool calls, errors, decisions, artifacts, and promotions should leave inspectable receipts.
- Packaged apps should remain portable for users outside the parent company.

### Voice
Practical, technical, operator-minded, concise, confident, inspectable.

### Avoid
“AI magic,” vague autonomy claims, fake dashboards presented as real telemetry, neon/HUD overload,
and enterprise jargon that hides what the software actually does.

## 4. Experience architecture

| Surface | Job |
|---|---|
| `/` | Umbrella story + install + proof + architecture map |
| `/docs/sam/` | Core mental model / system map / terminology |
| `/docs/sam/structured-decisions/` | Deterministic choose/score/check style decision machinery and receipts |
| `/docs/sam/native-runtime/` | Native/local runtime, machine/daemon/terminal model, portability boundaries |
| `/docs/sam/infrastructure-cookbooks/` | Concrete provider/deployment recipes |
| `/learn/` | Educational track: classical agents, planning, state, search, tools, memory, modern LLM integration |
| `/packages/sdk/help/` | Troubleshooting, setup, package-level help, known failure modes |
| `/themes/` | Productized theme/preset catalog; synthetic/demo content; compatibility + install metadata |

## 5. Homepage contract — PROPOSED

1. **Hero — What AgentSam is**
   - One sentence.
   - `npm install` / quickstart.
   - No requirement to understand every runtime first.

2. **System map — What is included**
   - SDK / CLI
   - decisions/planning
   - tools/plugins
   - runtime lanes
   - memory/knowledge
   - observability/receipts
   - packaged apps/themes

3. **Execution lanes**
   - This machine
   - Cloud/remote
   - Disposable sandbox
   Explain policy and portability, not just infrastructure branding.

4. **Structured decisions**
   Show a real input → evaluation → chosen action → receipt.

5. **Machine/runtime**
   Show local capability discovery and a real deterministic inspection.

6. **Build / verify / promote**
   Real pipeline and human approval boundaries.

7. **Learning + docs**
   Route by intent: “I want to use it,” “I want to understand it,” “I want to integrate it.”

8. **Packaged products**
   Local Studio / CAD / CMS / themes as examples of what the SDK can power, not requirements.

## 6. Themes remaster contract

The `/themes/` surface should become a **preset registry**, not a customer portfolio.

Every theme card should expose:

- Theme name
- Intended use
- Visual tokens
- Included section/component families
- Supported content contracts
- Responsive screenshots
- Dark/light/header/footer presets where applicable
- Version
- Compatibility
- Install/scaffold action
- Demo-content badge
- “No customer data/content included” boundary
- Optional source provenance

Customer builds may inspire a theme, but the published theme must use synthetic/neutral demo content.

## 7. SEO/content structure — PROPOSED

Each page should target a distinct question instead of repeating the homepage:

- What is AgentSam?
- How do I install/use the SDK?
- How does structured decision machinery work?
- How do I run work on my own machine?
- How do I deploy/connect it to infrastructure?
- How do classical agent techniques map to modern LLM agents?
- How do I troubleshoot the SDK?
- What reusable UI/theme products are available?

Required per page:
title, description, canonical, social card, clear H1, internal links, status/version context, examples.

## 8. Release audit lanes

### P1 — message convergence
- Umbrella story currently over-indexes on the sandbox lane.
- Define AgentSam vs SDK vs runtime vs apps/themes in plain language.
- Make the quickstart the shortest useful path.

### P1 — docs IA
- One docs landing page should visually map the docs routes and intended reader.
- Add “current / preview / experimental” status where appropriate.

### P1 — themes
- Replace customer-like presentation with reusable preset contracts and synthetic demos.

### P2 — proof
- Turn CLI/machine/decision/runtime output into real annotated examples and receipts.

### P2 — learn
- Organize educational material into tracks rather than a pile of pages.

### P3
- richer interactive demos only after the core mental model is coherent.

## 9. Definition of done for this milestone

- A new developer can describe AgentSam correctly after the first screen.
- A developer can reach a working quickstart without understanding company-internal infrastructure.
- Docs routes have distinct jobs and clear cross-links.
- Native/local and cloud/sandbox execution are presented as portable lanes, not contradictory products.
- Themes are clearly packaged presets, not client websites.
- Examples distinguish real output from illustrative UI.
- Reusable products do not require client-specific code or branding.
