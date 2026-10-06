/**
 * Snapshot FNF's donor content, NOT copies of its section renderer source.
 * Usage: node scripts/harvest-revise-site.mjs /path/to/inneranimalmedia-cms-site
 * Production and SDK consumers never require this donor checkout.
 */
import { build } from "esbuild";
import { readFile, writeFile, mkdtemp, rm, mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
if (!process.argv[2]) throw Error("Supply the donor repository path");
const donor = path.resolve(process.argv[2]);
const source = path.join(donor, "examples/revise-foundation/src/site-data.ts");
await readFile(source);
const temp = await mkdtemp(path.join(tmpdir(), "fnf-revise-site-"));
try {
  const target = path.join(temp, "donor.mjs");
  await build({ entryPoints: [source], outfile: target, bundle: true,
    platform: "node", format: "esm", target: "node22", logLevel: "error" });
  const module = await import("file://" + target);
  const pages = module.initialSite.pages.map((page) => ({
    id: page.id, path: page.path, title: page.title,
    description: page.description, sections: page.sections,
  }));
  const data = {
    schemaVersion: "fnf-revise-atlas-v1",
    source: {
      repository: "SamPrimeaux/inneranimalmedia-cms",
      commit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: donor, encoding: "utf8" }).trim(),
      site: "examples/revise-foundation",
    },
    brand: { name: module.initialSite.brand.name },
    catalog: module.sectionCatalog,
    media: Object.fromEntries(module.siteMedia),
    pages,
  };
  const instances = pages.reduce((n, p) => n + p.sections.length, 0);
  if (data.catalog.length !== 24 || pages.length !== 5 || instances !== 23) {
    throw Error("Donor changed: review the section count before replacing the 24/23-section baseline");
  }
  const output = path.join(root, "apps/ecommerce-cms-agentsam/fixtures/fnf-revise-site.json");
  await writeFile(output, JSON.stringify(data, null, 2) + "\n");
  console.log("Harvested " + data.catalog.length + " real presets and " + pages.length +
    " pages (" + instances + " instances) from " + data.source.commit.slice(0, 8) +
    " into " + output);
} finally {
  await rm(temp, { recursive: true, force: true });
}
