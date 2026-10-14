#!/usr/bin/env node
/**
 * Delete remote CMS KV snapshots so the next warm rebuilds from D1.
 * Run: npm run cms:republish
 */
import { execSync } from "node:child_process";
import { kvNamespaceId } from "./lib/account-id.mjs";

const NS = kvNamespaceId("CMS_CACHE");
const SLUGS = ["site", "home", "shop", "about", "community"];
const env = { ...process.env };

for (const slug of SLUGS) {
  try {
    execSync(
      `./scripts/with-cf-admin-env.sh npx wrangler kv key delete "cms:page:${slug}:v1" --namespace-id=${NS} --remote`,
      { stdio: "inherit", env }
    );
  } catch {
    /* key may not exist */
  }
}

console.log("Remote CMS KV cleared. Run cms:warm to rebuild from D1.");
