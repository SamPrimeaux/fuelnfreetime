# @inneranimalmedia/admin-dock

Mobile/tablet glass dock for AgentSam admin shells. One capsule; the agent is a tab
inside it, not a separate button.

| Mode | When | Contents |
|---|---|---|
| nav | default | tabs from config; the `agent` tab opens the composer, `nav` opens the full menu |
| edit | a page publishes save state | agent button, hint, discard, save (replaces a page's own sticky save bar) |
| compose | agent tab tapped | scope chip, quick chips for the current route, input, send |
| peek | a dock send resolves | compact status/reply above the capsule; full chat opens only from **Open chat** |

The active composer border, AgentSam tab, send button, focus rings, and peek actions all use the same manifest-driven accent. A host can therefore brand the interaction without changing this package.

**Swipe:** drag the capsule down to tuck it away; a 44px handle stays at the bottom edge.
Swipe the handle up (or tap it) to bring the capsule back. In compose, swiping down closes
the composer instead. The small grabber on top of the capsule is also a button. The hidden
state lasts for the browser session. Set `"startHidden": true` in the `dock` block to start every session tucked away (default `false`); a swipe during the session always wins. While tucked away, a page's own save bar returns as the
fallback, so Save is never unreachable.

## Install into a host

```js
import { mountAdminDock } from "/admin/dock/index.js";
mountAdminDock({
  config,                       // the app manifest's `dock` block
  host: { send, open, openNav } // send(prompt, { context }), open(), openNav()
});
```

Load `dock.css` once. All config lives in the manifest `dock` block — no env vars.

```json
"dock": {
  "agent": { "label": "AgentSam", "accent": "#7c3aed" },
  "tabs": [
    { "id": "home", "label": "Home", "href": "/admin/home", "icon": "home" },
    { "id": "agent", "label": "AgentSam", "action": "agent", "icon": "sparkle" },
    { "id": "menu", "label": "More", "action": "nav", "icon": "menu" }
  ],
  "scopes": [
    { "id": "orders", "label": "Orders", "match": ["/admin/orders"],
      "chips": [{ "label": "Flag problems", "prompt": "..." }] }
  ]
}
```

Route patterns: `/exact`, `/children/*` (children only), `*` fallback. Longest match wins.

## Edit mode contract

```js
window.__adminDockEdit = detail;
document.dispatchEvent(new CustomEvent("admin-dock:edit", { detail }));
// detail: { active, hint, dirty, canSave, saveLabel, onSave, discardHref, onDiscard }
```
Set `active: false` (or never publish) to return to nav. Omit `discardHref`/`onDiscard` to hide Discard.
In this app, `window.publishDockEdit(detail)` (from `shell.js`) does both lines.
Add `admin-dock-off` to `<body>` to hide the dock on a page that has not reserved `--admin-dock-clearance`.

## Authority

The scope chip and `context.dock_scope` are hints. They never grant edit
authority; the host's server must authorize any resource a request touches.

## Size contract (CSS px)

Bar 64 tall · every tap target ≥ 44 · handle 44 · side margin 16 + safe area · inputs 16px · at most 5 tabs.
Visible at or below `COMPACT_MAX_WIDTH` (900). See the app's responsive spec for the full ladder.
