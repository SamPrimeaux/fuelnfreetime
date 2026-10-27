// Fuel n Free Time host adapter ONLY.
// Shared implementation: agentsam-sdk/packages/providers/completeful/src/core/client.ts.
// vendor/agentsam-provider-completeful/dist is a verified compiled SDK snapshot.
import {
  createCompletefulClient,
  CompletefulApiError,
  completefulKeyMode as keyMode,
} from "@inneranimalmedia/agentsam-provider-completeful/api";

export { CompletefulApiError };
const DEFAULT_API_ORIGIN = "https://vxapi.completeful.com";

export async function completefulApiBase(env) {
  let origin = DEFAULT_API_ORIGIN;
  try {
    const { resolveCompletefulApiOrigin } = await import("../lib/integration-config.js");
    const resolved = await resolveCompletefulApiOrigin(env);
    if (resolved?.origin) origin = String(resolved.origin);
  } catch {
    // An unavailable optional provider integration record uses the canonical origin.
  }
  return origin.replace(/\/+$/, "").replace(/\/v1$/, "") + "/v1";
}
export function completefulKeyMode(env) {
  return keyMode(env?.CAPP_KEY);
}
export function completefulLiveWritesAllowed(env) {
  const value = env?.COMPLETEFUL_ALLOW_LIVE_WRITES;
  return value === true || String(value || "").toLowerCase() === "true";
}
export async function completefulWorkerClient(env) {
  return createCompletefulClient({
    apiKey: env?.CAPP_KEY,
    apiUrl: await completefulApiBase(env),
    allowLiveWrites: completefulLiveWritesAllowed(env),
    fetchImpl: globalThis.fetch,
  });
}
export async function completefulRequest(env, method, path, opts = {}) {
  return (await completefulWorkerClient(env)).request(method, path, opts);
}
export function assertCompletefulMutationAllowed(env) {
  return createCompletefulClient({
    apiKey: env?.CAPP_KEY,
    allowLiveWrites: completefulLiveWritesAllowed(env),
    fetchImpl: globalThis.fetch,
  }).assertMutationAllowed();
}
