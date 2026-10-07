import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createGenerationFlow, mountAssistantHeader, mountComposer } from "../frontend/static/js/generation-surfaces.mjs";

const require = createRequire(new URL("../package.json", import.meta.url));
const { JSDOM } = require("jsdom");

function page() {
  const dom = new JSDOM('<div id="agentsam-dock" data-surface="right"><header class="agentsam-head"></header><div id="agentsam-messages"></div><textarea id="agentsam-input" placeholder="Ask anything..."></textarea></div><div class="admin-dock__compose" data-composer-slot="dock"></div><div data-composer-slot="editor"></div><div id="te-tree"></div><section id="te-block-panel" data-surface="left" hidden></section><div id="te-inspector-body"></div><div data-agentsam-block="menu"></div>');
  return dom.window.document;
}

test("composer mounts in both slots and the assistant header replaces the old placeholder", () => {
  const document = page();
  mountComposer(document.querySelector("[data-composer-slot=\"dock\"]"), "dock");
  mountComposer(document.querySelector("[data-composer-slot=\"editor\"]"), "editor");
  assert.equal(document.querySelectorAll("agentsam-composer").length, 2);
  const header = mountAssistantHeader(document.querySelector("#agentsam-dock"), { selection: "Hero", expanded: false });
  assert.equal(header.actions.includes("New chat"), true);
  assert.equal(document.querySelector("#agentsam-input").placeholder.includes("Ask anything"), false);
  assert.equal(document.querySelector("#agentsam-dock").getAttribute("data-surface"), "right");
});

test("request stays editable and nothing generates before send", () => {
  const document = page();
  const flow = createGenerationFlow({
    assistant: document.querySelector("#agentsam-dock"),
    messages: document.querySelector("#agentsam-messages"),
    tree: document.querySelector("#te-tree"),
    panel: document.querySelector("#te-block-panel"),
    inspector: document.querySelector("#te-inspector-body"),
    wrapper: document.querySelector("[data-agentsam-block]"),
  });
  flow.handoff("shrinking sticky header");
  assert.equal(document.querySelector("[data-action-card]").closest("#agentsam-dock").getAttribute("data-surface"), "right");
  document.querySelector("[data-action-card]").click();
  const box = document.querySelector("[data-request-box]");
  box.value = "center the menu";
  assert.equal(flow.state.calls, 0);
  document.querySelector("[data-send-request]").click();
  assert.equal(flow.state.calls, 1);
  assert.equal(document.querySelector("#te-block-panel").getAttribute("data-surface"), "left");
  assert.equal(document.querySelector("miniagentsam-codepreview").getAttribute("data-lines"), "13");
  flow.complete({ padding: 12 }, { prompt: "center the menu" });
  assert.equal(document.querySelector("#te-inspector-body [data-ai-generated]") !== null, true);
  assert.equal(document.querySelector("#te-inspector-body [data-followup]") !== null, true);
});
