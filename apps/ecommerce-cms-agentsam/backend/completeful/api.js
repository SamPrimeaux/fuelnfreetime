import {
  assertCompletefulMutationAllowed,
  completefulRequest,
} from "./client.js";
import {
  COMPLETEFUL_CONTRACT,
  COMPLETEFUL_OPERATIONS,
} from "./operations.generated.js";

/**
 * Completeful API backed by the pinned vendor OpenAPI contract.
 *
 * Server-side only: the Worker owns the provider credential. This module is
 * intentionally NOT exposed as a generic remote-call admin endpoint.
 *
 * Existing domain handlers own account/shop authorization, order validation,
 * print preparation, idempotency lifecycles and product persistence.
 */
export { COMPLETEFUL_CONTRACT, COMPLETEFUL_OPERATIONS };

export class CompletefulContractError extends TypeError {
  constructor(message, field = null) {
    super(message);
    this.name = "CompletefulContractError";
    this.code = "completeful_invalid_operation_input";
    this.status = 400;
    this.field = field;
  }
}

function invalid(message, field = null) {
  throw new CompletefulContractError(message, field);
}
function assertObject(value, field, required = true) {
  if ((value == null && !required)) return;
  if (!value || typeof value !== "object" || Array.isArray(value)) invalid(field + " must be an object", field);
}
function assertPathId(value, field) {
  if (typeof value !== "string" && typeof value !== "number") invalid("Missing " + field, field);
  const v = String(value);
  if (!v || v === "." || v === ".." || v.length > 256 ||
    /[\x00-\x1f\x7f]/.test(v)) invalid("Invalid " + field, field);
  return encodeURIComponent(v);
}
function validateScalar(value, schema, field) {
  if (value == null) return;
  const types = Array.isArray(schema?.type) ? schema.type : schema?.type ? [schema.type] : [];
  if (types.length && !types.some(type => {
    if (type === "integer") return typeof value === "number" && Number.isSafeInteger(value);
    if (type === "number") return typeof value === "number" && Number.isFinite(value);
    if (type === "array") return Array.isArray(value);
    if (type === "object") return typeof value === "object" && value !== null && !Array.isArray(value);
    if (type === "null") return value === null;
    return typeof value === type;
  })) invalid("Incorrect type for " + field, field);
  if (schema?.enum && !schema.enum.includes(value)) invalid("Invalid value for " + field, field);
  if (typeof value === "number") {
    if (schema?.minimum != null && value < schema.minimum) invalid("Value below minimum: " + field, field);
    if (schema?.maximum != null && value > schema.maximum) invalid("Value above maximum: " + field, field);
  }
  if (typeof value === "string") {
    if (schema?.minLength != null && value.length < schema.minLength) invalid("String too short: " + field, field);
    if (schema?.maxLength != null && value.length > schema.maxLength) invalid("String too long: " + field, field);
  }
  if (Array.isArray(value) && schema?.maxItems != null && value.length > schema.maxItems) invalid("Too many items: " + field, field);
}

function pathFor(definition, params) {
  const required = definition.pathParams || [];
  if (required.length) assertObject(params, "path");
  const unexpected = Object.keys(params || {}).filter(key => !required.includes(key));
  if (unexpected.length) invalid("Unknown path parameter: " + unexpected[0], "path." + unexpected[0]);
  return definition.path.replace(/\{(\w+)\}/g, (_, key) =>
    assertPathId(params[key], "path." + key));
}
function queryFor(definition, query) {
  if (query == null) query = {};
  assertObject(query, "query");
  const allowed = definition.queryParams || [];
  for (const key of Object.keys(query)) {
    if (!allowed.includes(key)) invalid("Unsupported query argument: " + key, "query." + key);
  }
  for (const key of definition.requiredQuery || []) {
    if (query[key] == null || query[key] === "") invalid("Missing query argument: " + key, "query." + key);
  }
  const result = {};
  for (const [key,value] of Object.entries(query)) {
    if (value == null) continue;
    const schema = definition.querySchemas?.[key] || {};
    // Query parameters use wire strings but should respect numeric/enum contracts.
    let normalized = value;
    if (schema.type === "integer" || schema.type === "number") {
      normalized = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
    }
    validateScalar(normalized, schema, "query." + key);
    result[key] = Array.isArray(normalized) ? normalized.join(",") : normalized;
  }
  return result;
}
function bodyFor(definition, body) {
  if (body == null) {
    if (definition.bodyRequired) invalid("Request body required", "body");
    return undefined;
  }
  assertObject(body, "body");
  for (const key of definition.requiredBodyFields || []) {
    if (body[key] == null || body[key] === "") invalid("Missing body field: " + key, "body." + key);
  }
  return body;
}

/**
 * Provider operations have a known method and concrete path. The only
 * unguarded POSTs are readonly validation / quoting: even test keys must
 * guard supplier-side resource creations, renders, webhook actions, orders.
 */
const READ_ONLY_POSTS = new Set(["addresses.validate", "printFiles.validate", "orders.quote"]);

export async function callCompleteful(env, operationName, {
  path = {},
  query = {},
  body = undefined,
  idempotencyKey = null,
} = {}) {
  const def = COMPLETEFUL_OPERATIONS[operationName];
  if (!Object.hasOwn(COMPLETEFUL_OPERATIONS, operationName) || !def) {
    invalid("Unknown Completeful operation: " + String(operationName), "operation");
  }
  const endpoint = pathFor(def, path);
  const queryArgs = queryFor(def, query);
  const bodyArgs = bodyFor(def, body);
  if (def.method === "GET" && bodyArgs != null) invalid("GET cannot contain a body", "body");
  if (def.method === "DELETE" && bodyArgs != null) invalid("DELETE cannot contain a body", "body");
  if (def.method !== "GET" && !READ_ONLY_POSTS.has(operationName)) {
    assertCompletefulMutationAllowed(env);
  }
  if (idempotencyKey != null &&
      (typeof idempotencyKey !== "string" || !idempotencyKey.trim() || idempotencyKey.length > 256)) {
    invalid("Invalid idempotency key", "idempotencyKey");
  }
  return completefulRequest(env, def.method, endpoint, {
    query: queryArgs, body: bodyArgs, idempotencyKey,
  });
}

function resource(prefix) {
  return Object.freeze(Object.fromEntries(
    Object.keys(COMPLETEFUL_OPERATIONS).filter(key => key.startsWith(prefix + "."))
      .map(name => {
        const methodName = name.slice(prefix.length + 1);
        return [methodName, (env, options = {}) => callCompleteful(env, name, options)];
      })
  ));
}

/**
 * Every operation in the pinned spec has a callable method.
 * e.g. completefulApi.catalog.mockups(env, {path:{productId}, query:{print_location_id}})
 *      completefulApi.mockups.render(env, {body:{mockup_id,art_url},idempotencyKey})
 */
export const completefulApi = Object.freeze({
  referrals: resource("referrals"),
  shops: resource("shops"),
  catalog: resource("catalog"),
  addresses: resource("addresses"),
  printFiles: resource("printFiles"),
  designs: resource("designs"),
  assets: resource("assets"),
  products: resource("products"),
  orders: resource("orders"),
  webhooks: resource("webhooks"),
  mockups: resource("mockups"),
});
