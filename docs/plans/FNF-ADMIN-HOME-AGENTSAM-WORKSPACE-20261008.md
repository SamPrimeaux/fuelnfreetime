# FNF Admin Home / AgentSam Sidekick redesign — reference-fidelity specification
Date: 2026-10-08
Status: UI foundation implemented on a feature branch; connection workflows and end-to-end visual proof remain gated.

## Product intent

Make the store itself and the owner’s intent the first thing visible on /admin/home.
Use the supplied Shopify screenshots as **interaction and layout references**, while
retaining FNF/AgentSam identity and the canonical FNF ecommerce/CMS backend.

This is **not** permission to copy Shopify branding, invent demo data, install
unverified plugins, bring back store_theme_pages, or create a second editor.

### Visual reference inventory

1. **Shopify home, expanded sidebar** — centered store preview; compact store
   URL/browser chrome; large question; composer below; operational tiles
   below the focal interaction. Omit the promotional offer entirely.
2. **Shopify home, collapsed left rail** — preview/composer continue to center
   within the remaining workspace rather than moving into a fixed offset.
3. **Composer with suggestions** — small placeholder in a rounded white
   editor; on interaction, suggestions appear as quiet rows below; suggestions
   become real prompts when selected.
4. **Plus root menu** — anchored to the right-side plus button; 234px wide;
   white translucent surface, 12px radius, soft 1px border/shadow, ~36px
   row targets; leading monochrome icons, separators, and right chevrons.
5. **Plus child menus** — a back row replaces the root content; Files,
   Target, Mention, Skills and Apps all use the same popover and alignment.
6. **Skills creation reference** — a real modal with shortcut, instructions,
   validation and Save. This must not be simulated while FNF has only a
   read-only skills endpoint.
7. **Sidekick full focus** — the content viewport becomes the chat
   workspace; a small conversation header remains, messages are in a
   readable centered column, the composer is pinned near the bottom,
   and the narrow admin navigation is preserved when supported.
8. **Theme preview handoff** — chat remains visible in the side lane while
   the editor or theme listing is shown beside it; only authorized explicit
   mutations update CMS state.

### Geometry and hierarchy

- Home hero stage: centered within the admin main pane, maximum 760px
  content width. Preview about 350 x 197px, browser chrome above the
  scene, soft shadow, 12–14px corners and genuine storefront content.
- Hover/focus over preview: lift by about 4px; show a pill reading
  **Customize Theme** above; click/Enter goes to the canonical existing
  /admin/theme-editor?slug=home path (never an alternate editor).
- Main heading: 23–32px responsive, centered, two lines, restrained weight.
- Composer: max width 590px, 21px outer radius, white surface, muted
  instructions, subtle purple focus ring, textarea above control row.
- Composer controls: AgentSam mark left; Open chat, plus, send on right.
  Send becomes disabled only while the current request is pending.
- Suggestions: visible on composer focus, compact arrow-leading rows,
  matching the current store and supported agent workflows.
- Metrics: preserve the real /api/admin/overview read, but move activity
  counters and action cards below the primary store/assistant workspace.
- Side chat: compact right lane, approximately 350px wide, 16px card
  corners, no independent nested scroll containers other than message log.
- Full focus: do not use a fixed, centered 690px popup; the chat occupies
  the actual workspace. The conversation and composer remain the same DOM
  instances (no remount, no separate chat store).

### Interaction machine

home
  → focus composer → reveal suggestions
  → type/select suggestion → open existing chat → expand to focus → send
  → collapse → the same messages, conversation id and draft remain
  → close → only presentation hides, no implicit conversation reset
  → new chat action → explicit conversation reset

Escape from focus returns to docked chat; Escape from an overlay closes the
overlay. Tab/Shift+Tab follow visible controls. Reduced-motion setting
suppresses nonessential transitions. Mobile is one column; the drawer
does not cause the underlying page to overflow sideways.

### Plus menu: precise capabilities

| Row | Child view | Actual behavior / gate |
| --- | --- | --- |
| Files | Uploaded files, remove | File chips persisted in a shared per-page draft context |
| Upload from device | System picker | PNG/JPEG/WebP <=3MB, TXT/MD/JSON/CSV <=512KB, maximum 6 per send; text clipped to existing backend's 12k character cap with disclosure |
| Target | Current page, Storefront, Products, Orders, Customers, Content | Set a typed surface target in the chat context; selecting an actual product/order/customer ID requires a separate verified resource picker endpoint |
| Mention | Same resource categories | Inserts @mention text at cursor, not an invented resource ID |
| Skills | Registered skill list | GET /api/admin/agentsam/skills; selecting inserts the documented slash skill trigger; empty state honest |
| New Skill | Validation modal | **NOT IMPLEMENTED:** no authenticated skill-write endpoint verified. Do not enable Save or claim persisted state until schema, scopes, auth and receipts exist |
| Apps | Connected MCP servers / connection-needed | GET /api/admin/agentsam/status; connected items can be mentioned, disconnected items disclose authorization required |
| Generate app | Productized plugin/app flow | **NOT IMPLEMENTED:** require verified plugin product and installation lifecycle |
| Recents | Past conversations | **NOT IMPLEMENTED:** must query authorized account-scoped thread API, not reuse browser-local fake history |
| Voice | Dictation mode | **NOT IMPLEMENTED:** must use supported voice permissions/engine, transcripts and approval rules |

The menu root matches the reference ordering: Files, Upload from device,
divider, Target, Mention, Skills, divider, Apps. Each child has a back row.
Do not turn every menu option into a page navigation link.

### One ChatGPT plugin product, two independently authorized clients

**Client A: Justin in ChatGPT**
Justin installs the real published FNF/AgentSam plugin through ChatGPT,
initiates the plugin's OAuth sign-in, authorizes requested FNF scopes and
uses the resulting connection from ChatGPT. ChatGPT’s account and plugin
installation state are controlled by ChatGPT, not FNF UI code.

**Client B: Justin within FNF**
Justin signs into the FNF admin with his account. AgentSam obtains the
same canonical plugin capability descriptors, per-account installation,
connection status, and tool permissions through FNF/IAM. Each tool call
must be executed by the authorized backend and receive a receipt.

**The boundary**
Never copy ChatGPT auth cookies or ChatGPT-side plugin credentials into FNF.
A connected ChatGPT plugin does not automatically mean the same tool is
authorized in FNF, even when the principal is linked to the same account.

Canonical plugin product spine:
package/repository evidence → product contract → capability graph →
installation → OAuth connection → actual tool invocation →
result/receipt verification → derived READY.

Use governed agentsam_plugins / IAM installation records, not frontend
arrays of fake "connected" apps. Expose clear status:
available / installed / needs_connection / connected / ready.
Only ready capabilities appear as executable. Unavailable ones remain
discoverable with an explanation, not as broken buttons.

### Backend guarantees

- Existing /api/admin/agentsam/chat remains the only send route.
- Existing conversation_id is not rewritten on dock/focus changes.
- Preserve attachments and textarea on network/auth failure.
- Target context only describes an admin surface; it cannot invent a
  selected product ID, permission, or mutation.
- Read/suggest and apply/publish are separate. Write tools require
  explicit approval and actual persisted receipts.
- Existing CMS authority is cms_* with R2 artifact references; do not
  reintroduce store_theme_pages. FNF issue #75 governs remaining route
  normalization.
- Existing model lanes (Workers AI and configured OpenAI) stay server-side.
  UI must not expose provider credentials.

### Delivery sequence / gates

**Slice 1 — source implementation in this branch**
- Home storefront iframe and theme-editor link.
- Center composer, focus suggestions, real metric relocation.
- Shared nested plus menu and attachment chips.
- Rounded side chat, true content-pane focus mode, same conversation.
- Contract and syntax checks.

**Slice 2 — usability and visual acceptance before merge**
- Build admin assets and run FNF boundary/UI smoke tests.
- Screenshot at desktop 1440/1280 widths, narrow dock, full focus,
  390px and 320px phones; compare geometry to supplied reference.
- Click and keyboard-test the full menu and return/back paths.
- Confirm preview loads with production frame/CSP policy. If iframe is
  blocked, use a screenshot endpoint or approved preview renderer,
  never ship an empty frame or deceptive hero.
- Test actual chat conversation, attachments, browser refresh, degraded
  model response, reconnect and errors. Check no nested scrollbars.
- Capture deployment SHA and live route proof.

**Slice 3 — capabilities that must become real before "complete"**
- Account-scoped thread list/history API and Recents UI.
- Real typed resource search/picker for products, orders, customers,
  collections and media with authorization checks.
- Authenticated skill-create API and working creation modal.
- Plugin installation/connection/consent management screen in FNF,
  plus ChatGPT install/OAuth path, sharing backend contracts only.
- Voice entry and generation actions once their guarded backend
  capabilities are independently verified.

**Non-claims**
Current UI source work is not proof of production deployment, live
preview framing, plugin-ready state, or completed composer integration.
Keep the PR open until verification and the intended acceptance scope
are explicit.
