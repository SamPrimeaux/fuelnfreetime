# AgentSam Side Assistant — host extension contract

These are user-specified integration targets retained for the next focused implementation slice. They are NOT fulfilled by the editor generation-flow PR. Reuse live host authorities; do not invent fake menu items.

## Canonical run modes
- Use @inneranimalmedia/agentsam-workbench/agent RunMode semantics: Agent, Plan, Debug, Multitask, Ask.
- Host sends selected semantic run mode with the request. Backend runtime must enforce its execution posture, not just recolor the ring.
- Agent blue, Plan yellow, Debug red, Multitask subtle multicolor, Ask green, through theme tokens. Mode selection is not model selection.

## Composer + and @
- Compact + groups: Upload from device, Add from library, Mention, Skills, Apps/Widgets, Connected capabilities.
- Composer @ is a capability/context picker, not just Plugins. It consumes the shared Workbench projection, not a new registry.
- FNF adds authorized resource resolvers for Products, Orders, Customers, Collections; @product, @order, @customer, @collection.
- Selecting a resource attaches canonical structured, server-authorized resource identity; do not interpolate an identifier into prose and treat that as security.
- SideStage + and Composer @ use the same existing host/widget definitions where those surfaces exist.

## Skills and media
- Skills are per-user/workspace CRUD over existing AgentSam skill ownership. Shortcut, instructions, name, status, editable permissions where supported; no static skill fixtures.
- Device upload invokes input/upload; library picker searches real existing FNF media/content, shows thumbnails/filters, and attaches existing media references without re-upload.
- Resource, tool, permission, identity, persistence, and transport are host-owned. Portable Workbench owns presentation and selection interaction only.

## Reference acceptance
- Preserve compact rows, menu placement, contextual header, modal dimensions and picker behavior from authorized screenshot references.
- Replace donor brand with the existing canonical AgentSam SVG; never redraw sparkle art.
- Commit actual source screenshots before claiming screenshot pixel comparison. Pass at desktop/tablet/mobile without breaking orders/products/inventory/CMS routes.
