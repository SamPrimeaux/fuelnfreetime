import "./agentsam-composer.js";
import { createGenerationLock } from "./generation-lock.mjs";
import { createGenerationSession } from "./generation-stream.mjs";
import {
  createGenerationFlow,
  mountAssistantHeader,
  mountComposer,
} from "./generation-surfaces.mjs";

function waitFor(resolve, timeout = 8000) {
  const started = Date.now();
  return new Promise((done, reject) => {
    function tick() {
      const value = resolve();
      if (value) return done(value);
      if (Date.now() - started > timeout) return reject(new Error("generation surface not ready"));
      requestAnimationFrame(tick);
    }
    tick();
  });
}

async function consumeSse(response, handlers = {}) {
  if (!response.ok || !response.body) {
    let detail = {};
    try { detail = await response.json(); } catch {}
    throw new Error(detail.error || "generation request failed");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  let provider = null;

  function dispatchFrame(frame) {
    let name = "message";
    let data = "";
    frame.split(/\r?\n/).forEach((line) => {
      if (line.startsWith("event:")) name = line.slice(6).trim();
      if (line.startsWith("data:")) data += line.slice(5).trim();
    });
    if (!data) return;
    let payload;
    try { payload = JSON.parse(data); } catch { payload = { text: data }; }

    if (name === "chunk") handlers.onChunk?.(payload.text || "");
    else if (name === "phase") handlers.onPhase?.(payload.label || "");
    else if (name === "provider") {
      provider = payload;
      handlers.onProvider?.(payload);
    } else if (name === "patch") handlers.onPatch?.(payload);
    else if (name === "error") throw new Error(payload.error || "generation failed");
    else if (name === "abort") throw new DOMException("Aborted", "AbortError");
  }

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    pending += decoder.decode(value, { stream: true });
    let boundary;
    while ((boundary = pending.indexOf("\n\n")) >= 0) {
      const frame = pending.slice(0, boundary);
      pending = pending.slice(boundary + 2);
      if (frame.trim()) dispatchFrame(frame);
    }
  }
  if (pending.trim()) dispatchFrame(pending);
  return provider;
}

function selectionLabel(context) {
  if (!context) return "Theme";
  if (context.block_type) return context.block_type.replace(/-/g, " ");
  if (context.section_type) return context.section_type.replace(/-/g, " ");
  return context.page || "Theme";
}

async function init() {
  const editorSlot = await waitFor(() => document.querySelector('[data-composer-slot="editor"]'));
  const panel = await waitFor(() => document.getElementById("te-block-panel"));
  const tree = await waitFor(() => document.getElementById("te-tree"));
  const inspector = await waitFor(() => document.getElementById("te-inspector-body"));
  const drawer = await waitFor(() => document.getElementById("agentsam-drawer"));
  const messages = await waitFor(() => document.getElementById("agentsam-messages"));
  const bridge = await waitFor(() => window.AgentSamEditorGeneration);

  const composer = mountComposer(editorSlot, "editor");
  composer.setPlaceholder("Describe a section to create");
  const context = bridge.context?.() || {};
  composer.setChip(selectionLabel(context));
  mountAssistantHeader(drawer, {
    selection: selectionLabel(context),
    expanded: false,
  });

  const flow = createGenerationFlow({
    assistant: drawer,
    messages,
    panel,
    tree,
    inspector,
    wrapper: () => bridge.wrapper?.(),
  });
  const lock = createGenerationLock();
  let activeSession = null;

  composer.addEventListener("open-assistant", () => window.openAgentsamDrawer?.());
  composer.addEventListener("submit-request", (event) => {
    const text = String(event.detail?.text || "").trim();
    if (!text) return;
    window.openAgentsamDrawer?.();
    flow.handoff(text);
  });

  document.addEventListener("theme-editor:selection", (event) => {
    const next = event.detail || {};
    composer.setChip(selectionLabel(next));
    mountAssistantHeader(drawer, {
      selection: selectionLabel(next),
      expanded: drawer.getAttribute("aria-hidden") === "false",
    });
  });

  panel.addEventListener("agentsam-generation-stop", () => {
    activeSession?.abort();
  });

  panel.addEventListener("agentsam-generation-request", async (event) => {
    const requestText = String(event.detail?.request || "").trim();
    const preview = event.detail?.preview;
    const phase = event.detail?.phase;
    if (!requestText || !preview) return;

    const blockId = "generated-" + crypto.randomUUID().slice(0, 8);
    const contextNow = bridge.context?.() || {};
    const transport = async ({ signal, promptPrefix, onChunk, onPhase }) => {
      let provider = null;
      const response = await fetch("/api/admin/agentsam/generate-block", {
        method: "POST",
        credentials: "include",
        signal,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          capability: "code.generate",
          request: requestText,
          promptPrefix,
          context: contextNow,
          output_contract: "cms.generated-definition.v1",
        }),
      });
      provider = await consumeSse(response, {
        onChunk,
        onPhase(label) {
          phase.textContent = label;
          preview.setPhase?.(label);
          onPhase?.(label);
        },
        onProvider(value) {
          provider = value;
        },
      });
      return {
        chunks: [],
        provenance: {
          generator: "agentsam",
          provider: provider?.provider || "",
          model: provider?.model || "",
          prompt: requestText,
        },
      };
    };

    activeSession = createGenerationSession({
      id: "theme-editor:" + blockId,
      blockId,
      namespace: "agentsam",
      lock,
      prompt: requestText,
      sink: {
        append(chunk) {
          preview.appendText?.(chunk);
        },
      },
      transport,
      onPhase(label) {
        phase.textContent = label;
        preview.setPhase?.(label);
      },
    });

    try {
      const result = await activeSession.run();
      if (result?.aborted) {
        flow.fail("Generation stopped.");
        return;
      }
      if (!result?.ok || !result.record) {
        flow.fail(result?.error || "Generation failed.");
        return;
      }
      const provenance = {
        ...result.record.provenance,
        prompt: requestText,
        definition: result.record.definition,
      };
      flow.complete(result.record.settings, provenance);
    } catch (error) {
      if (error?.name === "AbortError") flow.fail("Generation stopped.");
      else flow.fail(error?.message || "Generation failed.");
    } finally {
      activeSession = null;
    }
  });
}

init().catch((error) => {
  console.warn("[theme-editor-generation]", error?.message || error);
});
