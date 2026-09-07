# Admin platform template plan

## Goal

Turn the current Fuel & Free Time admin into a reusable SaaS/admin platform without slowing down day-to-day product work. New features should land on shared shell, layout, interaction, and capability primitives instead of creating another page-specific mini-framework.

## Current runtime shape

The admin currently has two frontend paths:

- `public/admin/*` is the live static admin shell and owns most pages, `shell.js`, shared CSS, and both AgentSam surfaces.
- `admin-ui/src/*` is a separate React/Vite application used primarily for analytics.

AgentSam is also implemented twice:

- `public/admin/agentsam.html` + `agentsam-page.js` + `agentsam-page.css` for the full-page experience.
- `public/admin/js/agentsam.js` + `public/admin/css/agentsam.css` for the global dock/drawer.

The shell is reusable in structure but not yet in configuration. `public/admin/js/shell.js` directly owns Fuel & Free Time branding, logo URLs, navigation groups, store-menu copy, notification UI, mailbox-aware navigation, and AgentSam bootstrapping.

## P0: interaction shell

The first extraction seam is the AgentSam composer because it is already a cross-feature entry point.

Required behavior:

- Empty state: headline + composer centered in the available workspace.
- Chat/Work selector is an explicit surface choice rather than inferred from the prompt.
- After the first message or when an existing conversation is loaded, the composer docks to the bottom and the thread owns the main vertical space.
- The `+` action menu is scoped to the composer width, not the `+` button width.
- The action menu opens down when the composer is centered and flips above the composer when it is bottom-docked or viewport space requires it.
- Attachments, connections, and future actions remain registry-driven rather than becoming one-off buttons.

The UI may send `interaction_mode: "chat" | "work"` as metadata immediately. Backend routing should not be silently overloaded until Chat and Work have a defined runtime contract.

## P1: make the shell configuration-driven

Create one admin bootstrap descriptor, returned from a single endpoint or emitted into the page shell, with a shape similar to:

```js
{
  brand: {
    name,
    shortName,
    logoUrl,
    publicUrl
  },
  account: {
    displayName,
    avatarUrl,
    role
  },
  navigation: [...],
  capabilities: {
    agent,
    email,
    commerce,
    analytics,
    content,
    pos
  }
}
```

Then make `renderShell()` consume the descriptor instead of owning Fuel & Free Time values itself.

Move out of `shell.js`:

- hard-coded `LOGO_URL`
- `Fuel & Free Time` labels and `fuelnfreetime.com`
- hard-coded notification count
- product-specific nav definitions
- mailbox-specific nav mutation
- AgentSam-specific script boot logic

The shell should own only layout, responsive navigation behavior, topbar slots, focus/keyboard behavior, and rendering generic navigation descriptors.

## P1: extract reusable agent primitives

Keep one state model for both full-page and docked AgentSam surfaces:

- `AgentSurface`
- `AgentThread`
- `AgentComposer`
- `AgentActionMenu`
- `AgentAttachmentTray`
- `AgentConnectionList`
- `AgentViewSwitch`

A full page and a side drawer should be layout adapters around the same primitives and request client. Do not keep two independent implementations of attachment state, connection state, menus, sending, loading, and tool traces.

The API client should expose a small surface-neutral contract such as:

```js
send({ conversationId, message, attachments, interactionMode, actions, connections })
loadConversation(id)
listConversations()
```

## P1: remove stale shell coupling

`agentsam-page.js` still tries to hydrate `.console-sidenav-foot`, while the current shell renders `.console-sidenav-profile`. That means recent AgentSam activity is coupled to a shell node that no longer exists. Conversation navigation should become an explicit shell slot or Agent surface panel, not query for an old selector.

## P2: consolidate frontend authority

Do not big-bang rewrite the admin. First establish the reusable contracts above, then decide which runtime becomes authoritative.

Recommended migration:

1. Keep shipping the current static admin while extracting configuration and primitives.
2. Make page modules depend on the shared shell contract, not raw global DOM selectors.
3. Move shared tokens and components into one package/module boundary.
4. Port pages to the chosen runtime incrementally.
5. Retire the duplicate runtime only after route parity and visual regression checks exist.

The current split between `public/admin/*` and `admin-ui/src/*` is acceptable temporarily, but new platform primitives should not be duplicated across both trees.

## P2: shared design-system boundary

Promote page-local values into admin-wide tokens:

- workspace/surface/background colors
- text/muted/border colors
- accent and semantic states
- radii
- spacing scale
- content widths
- topbar/sidebar dimensions
- responsive breakpoints
- safe-area behavior
- focus rings and reduced-motion behavior

Pages should compose layout primitives such as `AdminPage`, `AdminPanel`, `AdminTable`, `AdminEmptyState`, `AdminToolbar`, and `AdminSplitPane` rather than redeclaring page-specific equivalents.

## Feature contract for future resale

A feature should be installable into the dashboard by registering data, not editing the shell:

```js
{
  key: "orders",
  label: "Orders",
  icon: "orders",
  route: "/admin/orders",
  navGroup: "main",
  capability: "commerce.orders"
}
```

The same rule should apply to Agent actions and connections. A new capability registers itself; it does not add bespoke markup to the global composer.

## Guardrails

- No customer/store brand strings in shared shell primitives.
- No feature-specific API fetches inside the generic shell.
- No duplicated Agent composer implementation.
- No navigation item that requires editing shell rendering logic to appear.
- No hard-coded capability assumptions when the server can return availability.
- Keep Chat vs Work as an explicit UI/runtime dimension; do not infer it from prompt text.
- Preserve clean URLs and mobile behavior while extracting internals.
- Prefer small reversible migrations over a second full admin rewrite.
