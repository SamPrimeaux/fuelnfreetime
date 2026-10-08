/** Typed public settings contract for generated CMS definitions.
 * Values never infer or redefine the public schema. */
export const SETTING_TYPES = Object.freeze([
  "text", "textarea", "rich_text", "number", "range", "boolean", "select",
  "color", "media", "video", "link", "font_role", "typography_preset",
  "product", "collection", "variant", "alignment", "spacing",
]);

const TYPE_ALIASES = Object.freeze({
  richtext: "rich_text",
  "rich-text": "rich_text",
  "font-role": "font_role",
  "typography-preset": "typography_preset",
});
const TYPES = new Set(SETTING_TYPES);
const FIELD = /^[a-z][a-zA-Z0-9_]{0,39}$/;
const REF = /^[a-zA-Z0-9][a-zA-Z0-9_:-]{0,127}$/;
const COLORS = /^(?:#[\da-fA-F]{3,8}|var\(--[a-zA-Z0-9-]+\))$/;
const ALIGN = new Set(["start", "center", "end", "stretch", "left", "right", "justify"]);
const UNITS = new Set(["", "px", "%", "rem", "em", "ms", "s", "deg", "fr"]);

export function normalizeSettingType(value) {
  const raw = String(value || "").trim();
  return TYPE_ALIASES[raw] || raw;
}

function validFieldValue(field, value) {
  if (value == null) return false;
  switch (field.type) {
    case "boolean":
      return typeof value === "boolean";
    case "number":
    case "range":
    case "spacing":
      return typeof value === "number" && Number.isFinite(value) &&
        (field.min == null || value >= field.min) &&
        (field.max == null || value <= field.max) &&
        (field.step == null || Math.abs((value - (field.min ?? 0)) / field.step -
          Math.round((value - (field.min ?? 0)) / field.step) < 1e-7);
    case "color":
      return typeof value === "string" && COLORS.test(value);
    case "select":
      return field.options.some((option) => option.value === value);
    case "alignment":
      return typeof value === "string" && ALIGN.has(value);
    case "media":
    case "video":
    case "product":
    case "collection":
    case "variant":
    case "font_role":
    case "typography_preset":
      return typeof value === "string" && REF.test(value);
    case "link":
      return typeof value === "string" && value.length <= 2000 &&
        (/^\/(?!\/)/.test(value) || /^#[-\w]+$/.test(value) ||
          /^https:\/\//.test(value) || /^mailto:/.test(value));
    default:
      return typeof value === "string" &&
        value.length <= (field.maxLength ?? (field.type === "rich_text" ? 8000 : 2000));
  }
}

export function normalizeSettingFields(declared, settings) {
  if (!declared || typeof declared !== "object" || Array.isArray(declared) || !Object.keys(declared).length) {
    throw new Error("Generated components require a declared typed definition.settings schema");
  }
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    throw new Error("Instance settings must be an object");
  }
  for (const key of Object.keys(settings)) {
    if (!Object.hasOwn(declared, key)) throw new Error("Undeclared instance setting: " + key);
  }

  const fields = {};
  const values = {};
  for (const [key, input] of Object.entries(declared)) {
    if (!FIELD.test(key) || !input || typeof input !== "object" || Array.isArray(input)) {
      throw new Error("Invalid declared generated setting schema: " + key);
    }
    const type = normalizeSettingType(input.type);
    if (!TYPES.has(type)) throw new Error("Unsupported generated setting type: " + key + " (" + input.type + ")");

    const field = {
      type,
      label: typeof input.label === "string" ? input.label.slice(0, 80) : key.replace(/_/g, " "),
      binding: input.binding === "style" ? "style" : "content",
    };
    if (input.binding != null && !["content", "style"].includes(input.binding)) {
      throw new Error("Unknown setting binding: " + key);
    }
    if (input.description != null) field.description = String(input.description).slice(0, 300);

    if (input.min != null || input.max != null || input.step != null) {
      if (!["number", "range", "spacing"].includes(type)) throw new Error("Numeric bounds are incompatible with " + key);
      for (const prop of ["min", "max", "step"]) {
        if (input[prop] == null) continue;
        if (typeof input[prop] !== "number" || !Number.isFinite(input[prop]) || (prop === "step" && input[prop] <= 0)) {
          throw new Error("Invalid numeric " + prop + ": " + key);
        }
        field[prop] = input[prop];
      }
      if (field.min != null && field.max != null && field.min > field.max) throw new Error("Invalid numeric range: " + key);
    }

    if (input.unit != null) {
      const unit = String(input.unit);
      if (!UNITS.has(unit) || !["number", "range", "spacing"].includes(type)) throw new Error("Invalid numeric unit: " + key);
      field.unit = unit;
    }
    if (input.maxLength != null) {
      if (!Number.isSafeInteger(input.maxLength) || input.maxLength < 1 || input.maxLength > 8000) {
        throw new Error("Invalid maxLength: " + key);
      }
      field.maxLength = input.maxLength;
    }
    if (type === "select") {
      if (!Array.isArray(input.options) || input.options.length < 1 || input.options.length > 60) {
        throw new Error("Select requires options: " + key);
      }
      field.options = input.options.map((option) => {
        const value = typeof option === "string" ? option : option?.value;
        if (typeof value !== "string" || value.length > 100) throw new Error("Invalid select option: " + key);
        return { value, label: String(option?.label || value).slice(0, 80) };
      });
    }
    if (input.default !== undefined) {
      if (!validFieldValue(field, input.default)) throw new Error("Invalid declared default: " + key);
      field.default = input.default;
    }

    const value = Object.hasOwn(settings, key) ? settings[key] : input.default;
    if (!validFieldValue(field, value)) throw new Error("Invalid instance value for " + key + " (" + type + ")");
    fields[key] = field;
    values[key] = value;
  }
  return { fields, settings: values };
}

export function settingCssValue(value, field = {}) {
  if (typeof value === "number") {
    const unit = field.unit != null ? field.unit : field.type === "spacing" ? "px" : "";
    return String(value) + unit;
  }
  return String(value);
}
