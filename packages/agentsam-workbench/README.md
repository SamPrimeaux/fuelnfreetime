# miniAgentSam

`@inneranimalmedia/agentsam-workbench` exports framework-neutral browser modules, allowing existing HTML/JS and React hosts to use one implementation without a second framework runtime. Package is locally packable, not npm-published.

`createMiniAgentSam(host)` returns `select(resource, getBounds)`, `close()` and `destroy()`. The host supplies `send({prompt, resource, capabilities, attachments, signal, onPhase})`, optional capability/attachment/voice controllers, and `generationMount()`. `send` must resolve only when execution finishes and reject errors. Call `onPhase({phase:'generating'})` only on real generation events. The pseudo-code preview never displays source, secrets or tool payloads.

`attachCapabilityMenu` and `createAttachmentController` are shared composer capabilities. The host must authorize all selected resources server-side; DOM selection is not authorization. Never pass a whole application instance. Selection positioning, responsive layout, thinking state, errors, attachments and the dark/purple UI live here. Store resource selection and drawer/thread integration live in the application's adapter.
