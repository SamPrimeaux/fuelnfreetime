import { applyHoisted, hoistSettings } from "./settings-hoist.mjs";
import { settingCssValue } from "./generated-settings-schema.mjs";
import { nsForms } from "./generation-namespace.mjs";

const ALIGNMENTS = ["start","center","end","stretch","left","right","justify"];

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;",
  })[char]);
}

function schemaField(key, value, schema) {
  const declared = schema?.[key];
  if (declared && typeof declared === "object") return { key, value, ...declared };
  // Compatibility-only renderer for already persisted pre-schema generated
  // settings. New generated artifacts are rejected unless they declare schema.
  return {
    key,
    value,
    label:key,
    type:typeof value === "boolean" ? "boolean" : key === "background" ? "color" : "range",
    binding:"style",
    __legacy:true,
  };
}

function optionsFor(field) {
  if (Array.isArray(field.options)) return field.options;
  if (field.type === "alignment") return ALIGNMENTS.map((value) => ({ value, label:value }));
  return [];
}

function fieldMarkup(field) {
  const key = escapeHtml(field.key);
  const id = "te-field-generated-" + key;
  const label = escapeHtml(field.label || field.key);
  const value = escapeHtml(field.value);
  const attrs = ' data-generated-setting="' + key + '" data-setting-type="' + escapeHtml(field.type) + '"';
  const prefix = '<div class="te-field" data-field-key="' + key + '"><label for="' + id + '">' + label + '</label>';

  if (field.type === "boolean") {
    return prefix + '<button id="' + id + '" type="button" class="te-switch" role="switch"' + attrs +
      ' data-boolean-field="' + key + '" aria-checked="' + (field.value ? "true" : "false") + '"></button></div>';
  }

  const options = optionsFor(field);
  if (field.type === "select" || (field.type === "alignment" && options.length)) {
    return prefix + '<select id="' + id + '"' + attrs + '>' +
      options.map((option) => {
        const optionValue = typeof option === "string" ? option : option.value;
        const optionLabel = typeof option === "string" ? option : (option.label || option.value);
        return '<option value="' + escapeHtml(optionValue) + '"' +
          (optionValue === field.value ? " selected" : "") + '>' + escapeHtml(optionLabel) + '</option>';
      }).join("") + '</select></div>';
  }

  if (field.type === "textarea" || field.type === "rich_text") {
    return prefix + '<textarea id="' + id + '"' + attrs + '>' + value + '</textarea></div>';
  }

  if (field.type === "range") {
    return prefix + '<div class="te-range-control"><input id="' + id + '" type="range"' +
      ' min="' + escapeHtml(field.min ?? 0) + '" max="' + escapeHtml(field.max ?? 100) +
      '" step="' + escapeHtml(field.step ?? 1) + '" value="' + value + '"' + attrs +
      ' data-range-field="' + key + '"></div></div>';
  }

  if (field.type === "color" && /^#[0-9a-f]{6}$/i.test(String(field.value || ""))) {
    return prefix + '<div class="te-color-control"><input id="' + id + '" type="color" value="' + value + '"' +
      attrs + ' data-color-field="' + key + '"></div></div>';
  }

  const numeric = ["number","spacing"].includes(field.type);
  const inputType = numeric ? "number" : field.type === "link" ? "url" : "text";
  const bounds = numeric
    ? ' min="' + escapeHtml(field.min ?? "") + '" max="' + escapeHtml(field.max ?? "") +
      '" step="' + escapeHtml(field.step ?? 1) + '"'
    : "";
  return prefix + '<input id="' + id + '" type="' + inputType + '" value="' + value + '"' +
    bounds + attrs + '></div>';
}

export function renderGeneratedSettings(body, values, schema = null) {
  const declared = schema && typeof schema === "object" ? schema : null;
  if (!declared) {
    const hoisted = hoistSettings(values);
    const legacyFields = Object.entries(values || {}).map(([key,value]) => schemaField(key,value,null));
    body.innerHTML = '<section data-settings-group="generated"><h3>Generated settings</h3>' +
      legacyFields.map(fieldMarkup).join("") + "</section>";
    return hoisted;
  }

  const fields = Object.entries(declared).map(([key,spec]) => schemaField(key, values?.[key], declared));
  const content = fields.filter((field) => field.binding !== "style");
  const style = fields.filter((field) => field.binding === "style");
  body.innerHTML =
    (content.length ? '<section data-settings-group="content"><h3>Content</h3>' + content.map(fieldMarkup).join("") + "</section>" : "") +
    (style.length ? '<section data-settings-group="appearance"><h3>Appearance</h3>' + style.map(fieldMarkup).join("") + "</section>" : "");
  return { fields, values };
}

function applyContentBinding(wrapper, key, value) {
  if (!wrapper?.querySelectorAll) return;
  wrapper.querySelectorAll('[data-cms="' + CSS.escape(key) + '"]').forEach((node) => {
    const attr = node.getAttribute("data-cms-attr");
    if (!attr || attr === "textContent") node.textContent = String(value);
    else if (["href","src","alt","title"].includes(attr)) node.setAttribute(attr, String(value));
  });
}

export function bindGeneratedSettings(body, wrapper, transport, schema = null) {
  const apply = function(key, value) {
    const field = schema?.[key];
    if (!field) {
      // Compatibility for already-created pre-schema artifacts only.
      applyHoisted(wrapper, { [key]:value });
    } else if (field.binding === "style" && wrapper?.style) {
      const instanceId = wrapper.getAttribute?.("data-agentsam-block") || "preview";
      const cssName = nsForms(instanceId).settingVarPrefix + key;
      wrapper.style.setProperty(cssName, settingCssValue(value, field));
    } else {
      applyContentBinding(wrapper, key, value);
    }
    if (transport && typeof transport.onChange === "function") transport.onChange(key, value);
  };

  body.querySelectorAll("[data-generated-setting]").forEach((input) => {
    const key = input.dataset.generatedSetting;
    const type = input.dataset.settingType;
    const convert = (raw) => ["number","range","spacing"].includes(type) ? Number(raw) : raw;
    if (type === "boolean") {
      input.addEventListener("click", () => {
        const next = input.getAttribute("aria-checked") !== "true";
        input.setAttribute("aria-checked", String(next));
        apply(key,next);
      });
      return;
    }
    const eventName = ["select","alignment","media","video","product","collection","variant"].includes(type) ? "change" : "input";
    input.addEventListener(eventName, () => apply(key,convert(input.value)));
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
  tree.querySelectorAll("[data-generating]").forEach((node) => node.remove());
}
