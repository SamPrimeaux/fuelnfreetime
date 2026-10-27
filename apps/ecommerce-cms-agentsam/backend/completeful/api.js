// Typed Completeful operation map is authored in the SDK's TypeScript source.
// FNF-specific adapter injects per-installation credentials and integration URL.
import {
  COMPLETEFUL_CONTRACT,
  COMPLETEFUL_OPERATIONS,
  CompletefulContractError,
} from "@inneranimalmedia/agentsam-provider-completeful/api";
import { completefulWorkerClient } from "./client.js";

export { COMPLETEFUL_CONTRACT, COMPLETEFUL_OPERATIONS, CompletefulContractError };
export async function callCompleteful(env, name, options = {}) {
  return (await completefulWorkerClient(env)).call(name, options);
}
const resources = [...new Set(Object.keys(COMPLETEFUL_OPERATIONS).map(key => key.split(".")[0]))];
export const completefulApi = Object.freeze(Object.fromEntries(resources.map(group => [
  group,
  Object.freeze(Object.fromEntries(
    Object.keys(COMPLETEFUL_OPERATIONS)
      .filter(key => key.startsWith(group + "."))
      .map(key => [key.slice(group.length + 1), (env, options = {}) =>
        callCompleteful(env, key, options)])
  )),
])));
