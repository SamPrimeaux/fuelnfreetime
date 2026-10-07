import { applyHoisted, hoistSettings } from "./settings-hoist.mjs";

function fieldMarkup(field) {
  const id = "te-field-generated-" + field.key;
  const label = field.label || field.key;
  if (field.type === "boolean") {
    return '<div class="te-field" data-field-key="' + field.key + '"><label>' + label + '</label><button type="button" class="te-switch" role="switch" data-boolean-field="' + field.key + '" aria-checked="' + (field.value ? "true" : "false") + '"></button></div>';
  }
  if (field.type === "color") {
    return '<div class="te-field" data-field-key="' + field.key + '"><label for="' + id + '">' + label + '</label><div class="te-color-control"><input id="' + id + '" type="color" value="' + field.value + '" data-color-field="' + field.key + '"></div></div>';
  }
  return '<div class="te-field" data-field-key="' + field.key + '"><label for="' + id + '">' + label + '</label><div class="te-range-control"><input id="' + id + '" type="range" min="' + (field.min ?? 0) + '" max="' + (field.max ?? 100) + '" step="' + (field.step ?? 1) + '" value="' + field.value + '" data-range-field="' + field.key + '"></div></div>';
}

export function renderGeneratedSettings(body, declared) {
  const hoisted = hoistSettings(declared);
  const editorFields = Object.entries(hoisted.editor).map(function(entry) {
    return fieldMarkup({ key: entry[0], label: entry[0], type: entry[0] === "motion" ? "boolean" : entry[0] === "background" ? "color" : "range", value: entry[1] });
  });
  const generatedFields = Object.entries(hoisted.generated).map(function(entry) {
    return fieldMarkup({ key: entry[0], label: entry[0], type: typeof entry[1] === "boolean" ? "boolean" : "range", value: entry[1] });
  });
  body.innerHTML =
    (editorFields.length ? '<section data-settings-group="editor"><h3>Editor</h3>' + editorFields.join("") + "</section>" : "") +
    '<section data-settings-group="generated"><h3>Generated settings</h3>' + generatedFields.join("") + "</section>";
  return hoisted;
}

export function bindGeneratedSettings(body, wrapper, transport) {
  const apply = function(key, value) {
    applyHoisted(wrapper, { [key]: value });
  };
  body.querySelectorAll("[data-range-field], [data-color-field]").forEach(function(input) {
    input.addEventListener("input", function() {
      apply(input.dataset.rangeField || input.dataset.colorField, input.value);
    });
  });
  body.querySelectorAll("[data-boolean-field]").forEach(function(button) {
    button.addEventListener("click", function() {
      const next = button.getAttribute("aria-checked") !== "true";
      button.setAttribute("aria-checked", String(next));
      apply(button.dataset.booleanField, next);
    });
  });
  return transport;
}

export function insertGeneratingNode(tree) {
  const node = tree.ownerDocument.createElement("div");
  node.className = "te-tree-section";
  node.setAttribute("data-generating", "true");
  node.innerHTML = '<div class="te-tree-row"><span class="te-tree-row__name">Generating...</span></div>';
  tree.prepend(node);
  return node;
}

export function removeGeneratingNode(tree) {
  tree.querySelectorAll("[data-generating]").forEach(function(node) { node.remove(); });
}
