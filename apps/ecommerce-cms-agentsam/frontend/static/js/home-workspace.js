/* Home assistant workspace — one chat endpoint and one conversation shared with the side/focus modes. */
(function () {
  "use strict";
  function initHomeAgent() {
    const form = document.getElementById("home-agent-form");
    const input = document.getElementById("home-agent-input");
    const send = document.getElementById("home-agent-send");
    const open = document.getElementById("home-agent-open");
    if (!form || !input || !send || form.dataset.ready) return;
    form.dataset.ready = "1";

    window.AgentSamComposerMenu?.mount(form, document.getElementById("home-agent-plus"), input);
    function pending(value) {
      send.disabled = value;
      input.setAttribute("aria-busy", String(value));
    }
    let active = false;
    async function waitForAgent() {
      if (typeof window.sendAgentsamMessage === "function") return;
      await new Promise((resolve) => {
        let ticks = 0;
        function retry() {
          if (typeof window.sendAgentsamMessage === "function" || ticks++ > 80) resolve();
          else requestAnimationFrame(retry);
        }
        retry();
      });
      if (typeof window.sendAgentsamMessage !== "function") throw new Error("AgentSam has not loaded. Please refresh the page.");
    }
    function report(message) {
      let feedback = form.querySelector(".fnf-home-composer__feedback");
      if (!feedback) {
        feedback = document.createElement("div");
        feedback.className = "fnf-home-composer__feedback";
        feedback.setAttribute("role", "status");
        form.append(feedback);
      }
      feedback.textContent = message;
    }
    async function launch(message, { focus = true } = {}) {
      const prompt = String(message || "").trim();
      if (!prompt || active) return;
      active = true;
      pending(true);
      report("");
      try {
        await waitForAgent();
        window.openAgentsamDrawer?.();
        if (focus) window.focusAgentsamDrawer?.();
        const draft = window.AgentSamDraft || { attachments: [] };
        await window.sendAgentsamMessage(prompt, {
          attachments: draft.attachments?.slice() || [],
          context: draft.selected_resource ? { selected_resource: draft.selected_resource } : {},
          propagateError: true
        });
        if (input.value.trim() === prompt) input.value = "";
        window.AgentSamComposerMenu?.clearFiles();
      } catch (error) {
        report(error.message || "Could not send the message; your draft is still here.");
      } finally {
        active = false;
        pending(false);
      }
    }
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      launch(input.value);
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
        event.preventDefault();
        launch(input.value);
      }
    });
    open?.addEventListener("click", async () => {
      try {
        await waitForAgent();
        window.openAgentsamDrawer?.();
      } catch (error) { report(error.message); }
    });
    document.querySelectorAll("[data-home-suggestion]").forEach((button) => {
      button.addEventListener("click", () => {
        const message = button.getAttribute("data-home-suggestion") || "";
        input.value = message;
        launch(message);
      });
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initHomeAgent, { once: true });
  else initHomeAgent();
})();
