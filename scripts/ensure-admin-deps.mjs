import { access } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const frontend = path.join(root, "apps/ecommerce-cms-agentsam/frontend");
const vite = path.join(frontend, "node_modules/.bin/vite");

try {
  await access(vite);
  console.log("Admin frontend dependencies already installed");
} catch {
  console.log("Installing locked admin frontend dependencies");
  const result = spawnSync("npm", ["ci", "--include=dev"], {
    cwd: frontend,
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) process.exit(result.status || 1);
}
