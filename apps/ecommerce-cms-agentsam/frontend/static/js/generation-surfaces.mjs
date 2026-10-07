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
      insertGeneratingNode(regions.tree);
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
      state.generating = true;
      state.calls += 1;
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
      bindGeneratedSettings(regions.inspector, regions.wrapper, null);
    },
  };
}
