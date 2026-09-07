import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const mappings = [
  ["app/frontend/admin/agentsam/agentsam.html", "public/admin/agentsam.html"],
  ["app/frontend/admin/agentsam/agentsam-page.css", "public/admin/css/agentsam-page.css"],
  ["app/frontend/admin/agentsam/agentsam-page.js", "public/admin/js/agentsam-page.js"],
];

for (const [sourcePath, outputPath] of mappings) {
  const source = path.join(root, sourcePath);
  const output = path.join(root, outputPath);
  await mkdir(path.dirname(output), { recursive: true });
  await copyFile(source, output);
}

console.log(`[app/frontend] synced ${mappings.length} AgentSam assets into public/ runtime output`);
