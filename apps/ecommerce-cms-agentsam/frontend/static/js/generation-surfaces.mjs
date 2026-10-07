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
      regions.panel.innerHTML = '<label>Request</label><textarea data-request-box="true">' + state.request + '</textarea><button type="button" data-send-request="true">Send</button>';
      regions.panel.querySelector("[data-send-request]").addEventListener("click", () => this.send());
    },
    send() {
      state.request = regions.panel.querySelector("[data-request-box]").value;
      state.generating = true;
      state.calls += 1;
      regions.panel.setAttribute("data-panel-state", "generating");
      regions.panel.setAttribute("data-surface", "left");
      regions.panel.innerHTML = '<div class="te-phase" aria-live="polite">Making layout responsive<button type="button" data-stop="true">Stop</button></div><miniagentsam-codepreview data-lines="13"></miniagentsam-codepreview>';
    },
    complete(settings, provenance) {
      state.generating = false;
      removeGeneratingNode(regions.tree);
      regions.panel.setAttribute("data-panel-state", "settings");
      const card = renderProvenanceCard(provenance, false);
      renderGeneratedSettings(regions.inspector, settings);
      const cardNode = regions.inspector.ownerDocument.createElement('details');
      cardNode.setAttribute('data-ai-generated', 'true');
      cardNode.innerHTML = '<summary>' + card.title + '</summary><p>' + card.prompt + '</p>';
      const follow = regions.inspector.ownerDocument.createElement('form');
      follow.setAttribute('data-followup', 'true');
      follow.innerHTML = '<input data-followup-input="true" /><button type="submit">Send</button>';
      regions.inspector.prepend(cardNode);
      regions.inspector.appendChild(follow);
      bindGeneratedSettings(regions.inspector, regions.wrapper, null);
    },
  };
}
