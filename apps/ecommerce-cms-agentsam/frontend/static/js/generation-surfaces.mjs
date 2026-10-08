import { insertGeneratingNode, removeGeneratingNode, renderGeneratedSettings, bindGeneratedSettings } from "./generation-inspector.mjs";
import { presentAgentsamProposal, renderAssistantHeader, renderProvenanceCard } from "./side-assistant.mjs";

export function mountComposer(slot, placement) {
  const composer = slot.ownerDocument.createElement("agentsam-composer");
  composer.setAttribute("data-placement", placement);
  composer.setAttribute("data-composer", "agentsam");
  slot.replaceChildren(composer);
  return composer;
}

export function mountAssistantHeader(dock, state) {
  const header = renderAssistantHeader(state);
  const head = dock.querySelector(".agentsam-head") || dock;
  let actions = head.querySelector("[data-assistant-actions]");
  if (!actions) {
    actions = dock.ownerDocument.createElement("div");
    actions.setAttribute("data-assistant-actions", "true");
    head.appendChild(actions);
  }
  actions.replaceChildren();
  header.actions.forEach(function(label) {
    const button = dock.ownerDocument.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.setAttribute("data-assistant-action", label);
    actions.appendChild(button);
  });
  const chip = dock.querySelector("[data-context-chip]") || dock.ownerDocument.createElement("span");
  chip.setAttribute("data-context-chip", "true");
  chip.textContent = header.chip;
  if (!chip.parentNode) head.appendChild(chip);
  const input = dock.querySelector("#agentsam-input");
  if (input) input.placeholder = header.placeholder;
  dock.setAttribute("data-surface", "right");
  return header;
}

export function createGenerationFlow(regions) {
  const state = { request: "", generating: false, calls: 0 };
  return {
    state,
    handoff(text) {
      state.request = text;
      regions.assistant.hidden = false;
      const card = presentAgentsamProposal({ title: "Create " + text });
      const node = regions.assistant.ownerDocument.createElement("button");
      node.type = "button";
      node.className = "agentsam-action-card";
      node.setAttribute("data-action-card", "true");
      node.textContent = card.title;
      regions.messages.appendChild(node);
      node.addEventListener("click", () => this.openRequest());
      return card;
    },
    openRequest() {
      regions.panel.hidden = false;
      regions.panel.setAttribute("data-panel-state", "request");
      regions.panel.replaceChildren();
      const doc = regions.panel.ownerDocument;
      const label = doc.createElement("label");
      label.textContent = "Request";
      const box = doc.createElement("textarea");
      box.setAttribute("data-request-box", "true");
      box.value = state.request;
      const send = doc.createElement("button");
      send.type = "button";
      send.setAttribute("data-send-request", "true");
      send.textContent = "Send";
      send.addEventListener("click", () => this.send());
      regions.panel.append(label, box, send);
    },
    send() {
      state.request = regions.panel.querySelector("[data-request-box]").value;
      if (!state.request.trim()) return;
      state.generating = true;
      state.calls += 1;
      insertGeneratingNode(regions.tree);
      regions.panel.setAttribute("data-panel-state", "generating");
      regions.panel.setAttribute("data-surface", "left");
      regions.panel.replaceChildren();
      const doc = regions.panel.ownerDocument;
      const phase = doc.createElement("div");
      phase.className = "te-phase";
      phase.setAttribute("aria-live", "polite");
      phase.textContent = "Making layout responsive";
      const stop = doc.createElement("button");
      stop.type = "button";
      stop.setAttribute("data-stop", "true");
      stop.textContent = "Stop";
      const preview = doc.createElement("miniagentsam-codepreview");
      preview.setAttribute("data-lines", "13");
      regions.panel.append(phase, stop, preview);
      const detail = { request: state.request, phase, stop, preview };
      regions.panel.dispatchEvent(new doc.defaultView.CustomEvent("agentsam-generation-request", {
        bubbles: true,
        detail,
      }));
      stop.addEventListener("click", () => {
        regions.panel.dispatchEvent(new doc.defaultView.CustomEvent("agentsam-generation-stop", {
          bubbles: true,
        }));
      });
      return detail;
    },
    fail(message) {
      state.generating = false;
      removeGeneratingNode(regions.tree);
      regions.panel.setAttribute("data-panel-state", "error");
      const doc = regions.panel.ownerDocument;
      const error = doc.createElement("p");
      error.className = "te-generation-error";
      error.textContent = message || "Generation failed.";
      const retry = doc.createElement("button");
      retry.type = "button";
      retry.textContent = "Edit request";
      retry.addEventListener("click", () => this.openRequest());
      regions.panel.replaceChildren(error, retry);
    },
    review(record, accept) {
      state.generating = false;
      removeGeneratingNode(regions.tree);
      regions.panel.setAttribute("data-panel-state", "review");
      regions.panel.replaceChildren();
      const doc = regions.panel.ownerDocument;
      const title = doc.createElement("strong");
      title.textContent = "Review " + (record.definition?.label || record.definition?.type || "generated section");
      const note = doc.createElement("p");
      note.textContent = "Script-free preview. Nothing has been saved or published yet.";
      const preview = doc.createElement("iframe");
      preview.className = "te-generated-sandbox";
      preview.setAttribute("title", "Generated section preview");
      preview.setAttribute("sandbox", "");
      preview.referrerPolicy = "no-referrer";
      const section = String(record.canonical?.html || "").replaceAll("__UID__","agentsam-gen-preview");
      const css = String(record.canonical?.css || "").replaceAll("__UID__","agentsam-gen-preview");
      preview.srcdoc = '<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src data:;"><style>' +
        css.replaceAll("</style","<\\/style") + '</style></head><body>' + section + '</body></html>';
      const acceptButton = doc.createElement("button");
      acceptButton.type = "button";
      acceptButton.setAttribute("data-accept-generated", "true");
      acceptButton.textContent = "Accept into private draft";
      const edit = doc.createElement("button");
      edit.type = "button";
      edit.textContent = "Revise request";
      edit.addEventListener("click", () => this.openRequest());
      acceptButton.addEventListener("click", async () => {
        acceptButton.disabled = true;
        acceptButton.textContent = "Installing…";
        try {
          const saved = await accept();
          if (!saved?.ok) throw new Error(saved?.error || "Unable to install section");
          regions.panel.setAttribute("data-panel-state", "installed");
          regions.panel.replaceChildren();
          const message = doc.createElement("p");
          message.textContent = "Added to private draft. Open the section inspector to edit its settings. Publish remains separate.";
          regions.panel.append(message);
        } catch (error) {
          acceptButton.disabled = false;
          acceptButton.textContent = "Retry installation";
          note.textContent = error.message || String(error);
          note.setAttribute("role","alert");
        }
      });
      regions.panel.append(title,note,preview,acceptButton,edit);
    },
    complete(settings, provenance) {
      state.generating = false;
      removeGeneratingNode(regions.tree);
      regions.panel.setAttribute("data-panel-state", "settings");
      const card = renderProvenanceCard(provenance, false);
      renderGeneratedSettings(regions.inspector, settings);
      const doc = regions.inspector.ownerDocument;
      const cardNode = doc.createElement("details");
      cardNode.setAttribute("data-ai-generated", "true");
      const summary = doc.createElement("summary");
      summary.textContent = card.title;
      const prompt = doc.createElement("p");
      prompt.textContent = card.prompt;
      cardNode.append(summary, prompt);
      const follow = doc.createElement("form");
      follow.setAttribute("data-followup", "true");
      const followInput = doc.createElement("input");
      followInput.setAttribute("data-followup-input", "true");
      const followSend = doc.createElement("button");
      followSend.type = "submit";
      followSend.textContent = "Send";
      follow.append(followInput, followSend);
      regions.inspector.prepend(cardNode);
      regions.inspector.appendChild(follow);
      const wrapper = typeof regions.wrapper === "function" ? regions.wrapper() : regions.wrapper;
      if (wrapper) bindGeneratedSettings(regions.inspector, wrapper, null);
    },
  };
}
