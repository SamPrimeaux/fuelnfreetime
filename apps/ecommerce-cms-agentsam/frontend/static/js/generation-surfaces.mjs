import { insertGeneratingNode, removeGeneratingNode, renderGeneratedSettings } from "./generation-inspector.mjs";
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
  const labels = { "New chat": "Start a new chat", Expand: "Expand Side Assistant", Collapse: "Dock Side Assistant" };
  const icons = {
    "New chat": "＋",
    Expand: "⤢",
    Collapse: "⤡",
  };
  header.actions.forEach(function(label) {
    const button = dock.ownerDocument.createElement("button");
    button.type = "button";
    button.textContent = icons[label] || label;
    button.title = labels[label] || label;
    button.setAttribute("aria-label", labels[label] || label);
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

function appendMessage(doc, container, role, text) {
  const item = doc.createElement("div");
  item.className = "agentsam-msg agentsam-msg--" + role;
  item.textContent = String(text);
  container.appendChild(item);
  return item;
}

/** The reusable visual flow never calls generation until the request panel's Send is clicked. */
export function createGenerationFlow(regions) {
  const state = { request: "", generating: false, calls: 0, installed: false };
  let placeholder = null;
  const doc = regions.panel.ownerDocument;
  const emit = (name, detail = {}) => regions.panel.dispatchEvent(
    new doc.defaultView.CustomEvent(name, { bubbles: true, detail }));

  const flow = {
    state,
    handoff(text) {
      state.request = String(text || "").trim();
      if (!state.request) return null;
      regions.assistant.hidden = false;
      appendMessage(doc, regions.messages, "user", state.request);
      appendMessage(doc, regions.messages, "assistant",
        "I can prepare this as an editable section. Review the request before starting generation.");
      const proposal = presentAgentsamProposal({
        title: "Create section", request: state.request, source: "miniAgentSam",
      });
      const card = doc.createElement("button");
      card.type = "button";
      card.className = "agentsam-action-card";
      card.setAttribute("data-action-card", "true");
      card.setAttribute("aria-label", "Review section creation request");
      const name = doc.createElement("strong");
      name.textContent = proposal.title;
      const summary = doc.createElement("small");
      summary.textContent = state.request;
      card.append(name, summary);
      regions.messages.appendChild(card);
      regions.messages.scrollTop = regions.messages.scrollHeight;
      card.addEventListener("click", () => flow.openRequest());
      return proposal;
    },
    openRequest() {
      if (state.generating) return;
      if (!placeholder || !placeholder.isConnected) placeholder = insertGeneratingNode(regions.tree);
      regions.panel.hidden = false;
      regions.panel.setAttribute("data-panel-state", "request");
      regions.panel.setAttribute("data-surface", "left");
      regions.panel.replaceChildren();
      const label = doc.createElement("label");
      const requestId = "agentsam-generation-request-text";
      label.htmlFor = requestId;
      label.textContent = "Describe the section";
      const box = doc.createElement("textarea");
      box.id = requestId;
      box.setAttribute("data-request-box", "true");
      box.setAttribute("aria-label", "Editable section generation request");
      box.value = state.request;
      const actions = doc.createElement("div");
      actions.className = "te-generation-actions";
      const send = doc.createElement("button");
      send.type = "button";
      send.setAttribute("data-send-request", "true");
      send.setAttribute("aria-label", "Send section generation request");
      send.textContent = "Send →";
      send.addEventListener("click", () => flow.send());
      actions.append(send);
      regions.panel.append(label, box, actions);
      box.focus();
    },
    send() {
      if (state.generating) return null;
      const input = regions.panel.querySelector("[data-request-box]");
      if (!input) return null;
      const request = String(input.value || "").trim();
      if (!request) return null;
      state.request = request;
      state.generating = true;
      state.calls += 1;
      if (!placeholder || !placeholder.isConnected) placeholder = insertGeneratingNode(regions.tree);
      regions.panel.setAttribute("data-panel-state", "generating");
      regions.panel.setAttribute("data-surface", "left");
      regions.panel.replaceChildren();
      const head = doc.createElement("div");
      head.className = "te-generation-head";
      const phase = doc.createElement("div");
      phase.className = "te-phase";
      phase.setAttribute("aria-live", "polite");
      phase.textContent = "Preparing section";
      const stop = doc.createElement("button");
      stop.type = "button";
      stop.setAttribute("data-stop", "true");
      stop.setAttribute("aria-label", "Stop section generation");
      stop.textContent = "Stop";
      head.append(phase, stop);
      const preview = doc.createElement("miniagentsam-codepreview");
      preview.setAttribute("data-lines", "13");
      regions.panel.append(head, preview);
      stop.addEventListener("click", () => emit("agentsam-generation-stop"));
      const detail = { request, phase, stop, preview };
      emit("agentsam-generation-request", detail);
      return detail;
    },
    fail(message) {
      state.generating = false;
      removeGeneratingNode(regions.tree);
      placeholder = null;
      regions.panel.setAttribute("data-panel-state", "error");
      const error = doc.createElement("p");
      error.className = "te-generation-error";
      error.setAttribute("role", "alert");
      error.textContent = message || "Generation failed.";
      const retry = doc.createElement("button");
      retry.type = "button";
      retry.textContent = "Edit request";
      retry.addEventListener("click", () => flow.openRequest());
      regions.panel.replaceChildren(error, retry);
    },
    review(record, accept, provenance = {}) {
      state.generating = false;
      regions.panel.setAttribute("data-panel-state", "review");
      regions.panel.replaceChildren();
      const title = doc.createElement("strong");
      title.textContent = "Review " + (record.definition?.label || record.definition?.type || "generated section");
      const note = doc.createElement("p");
      note.textContent = "Script-disabled preview. This is not yet installed or published.";
      const preview = doc.createElement("iframe");
      preview.className = "te-generated-sandbox";
      preview.title = "Generated section preview";
      preview.setAttribute("sandbox", "");
      preview.referrerPolicy = "no-referrer";
      const section = String(record.canonical?.html || "").replaceAll("__UID__", "agentsam-gen-preview");
      const css = String(record.canonical?.css || "").replaceAll("__UID__", "agentsam-gen-preview");
      preview.srcdoc = '<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src data:;"><style>' +
        css.replaceAll("</style", "<\\/style") + '</style></head><body>' + section + '</body></html>';
      const acceptButton = doc.createElement("button");
      acceptButton.type = "button";
      acceptButton.setAttribute("data-accept-generated", "true");
      acceptButton.textContent = "Accept into private draft";
      const edit = doc.createElement("button");
      edit.type = "button";
      edit.textContent = "Edit request";
      edit.addEventListener("click", () => flow.openRequest());
      acceptButton.addEventListener("click", async () => {
        acceptButton.disabled = true;
        acceptButton.textContent = "Installing…";
        try {
          const result = await accept();
          if (!result?.ok) throw new Error(result?.error || "Unable to install section");
          flow.complete(record.settings || {}, provenance);
        } catch (error) {
          acceptButton.disabled = false;
          acceptButton.textContent = "Retry installation";
          note.textContent = error?.message || String(error);
          note.setAttribute("role", "alert");
        }
      });
      regions.panel.append(title, note, preview, acceptButton, edit);
    },
    complete(settings = {}, provenance = {}) {
      state.generating = false;
      state.installed = true;
      removeGeneratingNode(regions.tree);
      placeholder = null;
      regions.panel.setAttribute("data-panel-state", "settings");
      regions.panel.replaceChildren();
      const message = doc.createElement("p");
      message.className = "te-generation-installed";
      message.textContent = "Installed in your private draft. Edit its settings in the inspector, or send a follow-up. Publish separately.";
      regions.panel.append(message);
      // The host's native inspector owns settings after installation. Only
      // create fallback demo fields when no host inspector fields are mounted.
      if (!regions.inspector.querySelector(".te-field, [data-field-key], [data-setting-key]") &&
          !regions.inspector.querySelector("[data-generated-history]")) {
        renderGeneratedSettings(regions.inspector, settings);
      }
      regions.inspector.querySelector("[data-ai-generated]")?.remove();
      regions.inspector.querySelector("[data-followup]")?.remove();
      const card = renderProvenanceCard(provenance, false);
      const details = doc.createElement("details");
      details.setAttribute("data-ai-generated", "true");
      const summary = doc.createElement("summary");
      summary.textContent = card.title;
      const prompt = doc.createElement("p");
      prompt.textContent = card.prompt;
      const source = doc.createElement("small");
      source.textContent = [provenance.provider, provenance.model].filter(Boolean).join(" · ") || "AgentSam";
      details.append(summary, prompt, source);
      const follow = doc.createElement("form");
      follow.setAttribute("data-followup", "true");
      const followInput = doc.createElement("textarea");
      followInput.rows = 2;
      followInput.setAttribute("data-followup-input", "true");
      followInput.setAttribute("aria-label", "Follow up on this generated section");
      followInput.placeholder = "Describe a change to this section";
      const followSend = doc.createElement("button");
      followSend.type = "submit";
      followSend.setAttribute("aria-label", "Review section follow-up");
      followSend.textContent = "Send →";
      follow.append(followInput, followSend);
      follow.addEventListener("submit", event => {
        event.preventDefault();
        const next = followInput.value.trim();
        if (!next) return;
        state.request = next;
        flow.openRequest(); // still no generation until explicit left-panel Send
      });
      regions.inspector.prepend(details);
      regions.inspector.append(follow);
    },
  };
  return flow;
}
