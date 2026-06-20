#!/usr/bin/env node
/**
 * Port legacy analytics page scripts to admin-ui TSX modules.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const assets = path.join(root, "public/admin/analytics/assets");
const outDir = path.join(root, "admin-ui/src/pages/analytics");

const pages = [
  { file: "98b26e01-8bb8-4a43-b3db-55326925c916.js", export: "OverviewPage", out: "OverviewPage.tsx" },
  { file: "ab9573c2-3cbc-4053-bf19-beb07f32cfaa.js", export: "FinancePage", out: "FinancePage.tsx" },
  { file: "cc20c761-d717-4df3-aafd-03c0be627412.js", export: "HealthPage", out: "HealthPage.tsx" },
];

const header = `import { Fragment, useMemo } from "react";
import {
  AreaChart,
  Donut,
  HBars,
  Icon,
  KPI,
  Sparkline,
  fmtNum,
  genSeries,
  seedRand,
} from "../../components/analytics-ui";
import type { RangeKey } from "../../lib/types";

type PageProps = { range: RangeKey; tenant?: string };

`;

for (const p of pages) {
  let src = fs.readFileSync(path.join(assets, p.file), "utf8");
  src = src.replace(/^\/\/[^\n]*\n/, "");
  src = src.replace(/^const \{[^}]+\} = React;\n\n?/, "");
  src = src.replace(new RegExp(`^function ${p.export}`), `export default function ${p.export}`);
  src = src.replace(new RegExp(`\\nwindow\\.${p.export} = ${p.export};\\s*$`), "");
  src = src.replace(/\buseMemoO\b/g, "useMemo");
  src = src.replace(/\buseStateO\b/g, "useState");
  src = src.replace(/\buseEffectO\b/g, "useEffect");
  src = src.replace(
    `function ${p.export}({ range, tenant })`,
    `function ${p.export}({ range, tenant = "all" }: PageProps)`
  );
  fs.writeFileSync(path.join(outDir, p.out), header + src);
  console.log("Wrote", p.out);
}
