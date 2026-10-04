# @inneranimalmedia/admin-dock

Mobile/tablet glass dock for AgentSam admin shells. One capsule with three
presentations, plus a detached agent orb:

| Mode | When | Contents |
|---|---|---|
| nav | default | tabs from config; `More` calls `host.openNav()` |
| edit | a page publishes save state | hint, Discard, Save (replaces a page's own sticky save bar) |
| compose | orb tapped | scope chip, quick chips for the current route, input, send |

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
  "agent": { "label": "AgentSam" },
  "tabs": [
    { "id": "home", "label": "Home", "href": "/admin/home", "icon": "home" },
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
Set `active: false` (or never publish) to return to nav.

## Authority

The scope chip and `context.dock_scope` are hints. They never grant edit
authority; the host's server must authorize any resource a request touches.

## Size contract (CSS px)

Bar 64 tall · orb 56 · every tap target ≥ 44 · side margin 16 + safe area · inputs 16px.
Visible at or below `COMPACT_MAX_WIDTH` (900). See the app's responsive spec for the full ladder.
