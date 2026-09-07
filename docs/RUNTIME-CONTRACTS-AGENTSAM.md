# Runtime Contract — AgentSam

This document is the source-of-truth contract for the Fuel & Free Time AgentSam surface and runtime.

## Source authority

AgentSam application code lives under `app/`.

```text
app/
  frontend/
    admin/
      agentsam/
        agentsam.html
        agentsam-page.css
        agentsam-page.js
  backend/
    admin/
      agentsam.js
    agentsam/
      *.js
    lib/
      auth.js
```

`public/` is Cloudflare static-asset **output**, not AgentSam source authority. `npm run app:frontend:sync` copies the three AgentSam frontend assets into the legacy `/admin/...` public paths required by the current Worker asset binding.

`src/admin/agentsam.js` and `src/agentsam/*.js` are compatibility re-export bridges only. New AgentSam implementation work must be made under `app/backend/`.

The broader admin shell and shared auth are still migrating. `app/backend/lib/auth.js` currently bridges to `src/lib/auth.js`; do not create another auth implementation.

## Routes

- UI: `/admin/agentsam`
- Chat API: `POST /api/admin/agentsam/chat`
- Tool/config APIs remain under `/api/admin/agentsam/*`
- Admin authentication remains the existing `fnf_admin_session` contract.

## Interaction modes

`Chat` and `Work` are explicit interaction surfaces, not synonyms for model routing or task type.

The client sends:

```json
{
  "context": {
    "interaction_mode": "chat"
  }
}
```

or:

```json
{
  "context": {
    "interaction_mode": "work"
  }
}
```

Do not overload the existing workflow/image `mode`, `task_type`, or `lane` fields to represent the Chat/Work UI state.

### Chat

Chat is the calm conversational surface.

- Empty state: centered composer with a small prompt above it.
- Chat/Work segmented control is visible before the first turn.
- Composer moves to the bottom once a conversation begins.
- No Project / Files / Plugins utility rail is shown merely because Chat is active.
- Model and reasoning/effort controls are available from the composer.

### Work

Work is task-oriented but must stay visually quiet.

- Same centered empty-state behavior and bottom-docked conversation behavior as Chat.
- Model and reasoning/effort controls are available from the composer.
- A secondary utility rail sits immediately below the composer with `Project`, `Files`, and `Plugins` entry points.
- Work does **not** imply that repository, files, plugins, tools, or project context are automatically injected. Those capabilities are explicit user selections.
- Work may become a richer execution surface later, but it must reuse the same conversation/composer primitives rather than fork a second chat implementation.

## Model and effort controls

Both Chat and Work expose model selection and reasoning/effort selection.

UI requirements:

- Keep the selected model or default policy visible as a compact composer control.
- Keep effort/reasoning adjacent to model selection, not in a separate settings page.
- Menus are lightweight anchored popovers with one clear selected state.
- Model/effort selection is request metadata and must be resolved by the backend model registry; do not hardcode provider behavior in DOM event handlers.

## Plugins and @ mentions

Plugins are explicit composer capabilities.

- The user can select a plugin from `Plugins` or invoke it using `@` mention syntax.
- Once selected, show a small plugin icon and subtle plugin name inside the composer rather than a large card or persistent banner.
- Plugin selection must remain removable before send.
- The composer should represent plugin identity; the backend remains responsible for authorization, tool availability, and invocation.
- Do not auto-enable every connected integration on a new conversation.

## Files and Project

`Project` and `Files` are Work utility affordances, not implicit context.

- Project selection should be explicit and visible.
- File attachments are per-turn unless deliberately attached to a persistent project/work artifact.
- Never infer a project merely because Work is selected.

## Tool-call presentation

Tool activity uses a collapsed breadcrumb by default.

```text
Called tool ⌄
```

Requirements:

- Do not render full request/response payload cards inline by default.
- A running or completed tool call appears as a minimal breadcrumb in the message stream.
- Expanding the breadcrumb reveals an inspector with tool identity, status, request/input preview, response/output preview, error details when present, and copy actions.
- Multiple calls may appear as separate breadcrumbs or a compact grouped sequence, but the default transcript must stay readable.
- Tool-call rendering is presentation only; canonical tool telemetry remains backend-owned.

## Composer action menu

The `+` action menu is composer-width, not button-width.

- Empty state: prefer opening below the centered composer when viewport space permits.
- Active thread: prefer opening above the bottom-docked composer.
- Rows use a small icon, primary label, and restrained secondary description.
- Connections/plugins are surfaced through reusable data-driven rows rather than Fuel & Free Time-specific markup.

## Frontend state model

AgentSam frontend work should converge on one state model containing at least:

```js
{
  interactionMode: "chat" | "work",
  conversationId: string | null,
  modelKey: string | null,
  effort: string | null,
  project: object | null,
  attachments: [],
  selectedPlugins: [],
  activeToolCalls: []
}
```

Do not create separate state machines for the full-page AgentSam and docked AgentSam. They should become layout hosts around the same reusable interaction primitives.

## Build / deploy

Because Wrangler currently serves `[assets].directory = "./public"`, source files under `app/frontend/` are materialized into `public/` before local Worker startup and deployment.

Commands:

```bash
npm run app:frontend:sync
npm run dev
npm run build
npm run deploy
```

`npm run dev`, admin builds, and worker predeploy all run the sync step so a clean checkout does not require manually editing or restoring generated `public/admin/agentsam*` files.

## Migration rule

New AgentSam source belongs under `app/frontend` or `app/backend`. Legacy `public/admin/agentsam*`, `src/admin/agentsam.js`, and `src/agentsam/*` paths must not regain implementation authority.
