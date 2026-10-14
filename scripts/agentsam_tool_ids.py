#!/usr/bin/env python3
"""
agentsam_tool_ids.py -- move FNF-branded AgentSam tool keys to neutral operation ids.

Stdlib only. Never touches a database. Git is the backup: no .bak files are made, and
`rename --apply` refuses to run on a dirty tree unless --allow-dirty.

Identity model (matches the SDK's SAM operations):
  operation id : dotted, product-neutral verb the agent calls      media.image.optimize
  wire key     : provider-safe form of the same id (a-z0-9_ only)  media_image_optimize
  capability   : permission unit, already neutral, left unchanged  media.image.optimize

D1 `tool_key` and `tool_name` both become the wire key (today they are identical), so code that
already looks tools up by either keeps working and no provider ever sees a dot. The dotted id
lives in the typed descriptors and in OPERATION_ID_BY_WIRE (legacy-aliases.ts).
Row ids (ast_fnf_*) are opaque primary keys and are intentionally NOT renamed.

Subcommands
  audit     read-only census: where every old key appears, and what fnf_* tokens are left
  sql       write a reviewable D1 migration (UPDATE tool_key/tool_name); it is never executed
  scaffold  create backend/tools/*.ts (typed contracts + legacy alias map) and a kernel test
  rename    codemod old keys -> wire keys in tracked files (dry run unless --apply)

Typical order
  python3 scripts/agentsam_tool_ids.py audit
  python3 scripts/agentsam_tool_ids.py scaffold
  python3 scripts/agentsam_tool_ids.py rename            # review the report
  python3 scripts/agentsam_tool_ids.py rename --apply
  python3 scripts/agentsam_tool_ids.py sql               # review, then run it yourself
"""
from __future__ import annotations

import argparse
import datetime
import re
import subprocess
import sys
from collections import defaultdict
from pathlib import Path

# (old tool_key, new dotted operation id). Merchant-facing first, operator tier last.
MERCHANT = [
    ("fnf_store_orders_list", "commerce.orders.list"),
    ("fnf_store_products_list", "commerce.products.list"),
    ("fnf_cms_pages_list", "cms.pages.list"),
    ("fnf_media_library_list", "media.library.list"),
    ("fnf_media_library_sync", "media.library.sync"),
    ("fnf_media_upload", "media.asset.create"),
    ("fnf_r2_media_list", "storage.objects.list"),
    ("fnf_image_optimize", "media.image.optimize"),
    ("fnf_image_variant_plan", "media.image.plan_variants"),
    ("fnf_glb_inspect", "media.model.inspect"),
    ("fnf_glb_optimize", "media.model.optimize"),
    ("fnf_icon_generate", "media.icon.generate"),
    ("fnf_icon_optimize", "media.icon.optimize"),
    ("fnf_video_optimize", "media.video.optimize"),
    ("fnf_video_thumbnail", "media.video.thumbnail"),
    ("fnf_asset_publish", "media.asset.publish"),
    ("fnf_content_asset_link", "media.asset.link"),
    ("fnf_brand_asset_audit", "brand.assets.audit"),
    ("fnf_semantic_search", "search.semantic"),
    ("fnf_analytics_summary", "analytics.summary.get"),
    ("fnf_agentsam_ai_models", "agent.models.list"),
]
# Developer/operator tools. Renamed so a merchant install can simply not enable the pack.
OPERATOR = [
    ("fnf_d1_query", "operator.database.query"),
    ("fnf_worker_deploy", "operator.worker.deploy"),
    ("fnf_mcp_bridge_status", "operator.mcp.status"),
]
MAPPING = MERCHANT + OPERATOR

OP_ID_RE = re.compile(r"^[a-z][a-z0-9]*(\.[a-z][a-z0-9_]*)+$")
TEXT_EXT = {".js", ".mjs", ".cjs", ".ts", ".tsx", ".json", ".sql", ".toml", ".md"}
EXCLUDE_PREFIXES = ("legacy/", "docs/archive/")
EXCLUDE_NAMES = {"package-lock.json"}
ALIASES_REL = "apps/ecommerce-cms-agentsam/backend/tools/legacy-aliases.ts"
MIGRATION_GLOB = "db/migrate-agentsam-tool-operation-ids-"
MAX_BYTES = 2_000_000


def wire(op_id: str) -> str:
    return op_id.replace(".", "_")


def sanity_check() -> None:
    seen_old, seen_wire = set(), set()
    for old, op in MAPPING:
        if not OP_ID_RE.match(op):
            sys.exit(f"bad operation id {op!r}")
        if old in seen_old or wire(op) in seen_wire:
            sys.exit(f"duplicate mapping for {old!r} / {wire(op)!r}")
        seen_old.add(old)
        seen_wire.add(wire(op))


def repo_root() -> Path:
    try:
        out = subprocess.run(["git", "rev-parse", "--show-toplevel"],
                             capture_output=True, text=True, check=True).stdout.strip()
        return Path(out)
    except (subprocess.CalledProcessError, FileNotFoundError):
        sys.exit("run this inside the git repository")


def tracked(root: Path) -> list[str]:
    out = subprocess.run(["git", "-C", str(root), "ls-files", "-z"],
                         capture_output=True, check=True).stdout
    return [p for p in out.decode("utf-8", "replace").split("\0") if p]


def dirty(root: Path) -> bool:
    out = subprocess.run(["git", "-C", str(root), "status", "--porcelain"],
                         capture_output=True, text=True, check=True).stdout
    return bool(out.strip())


def candidates(root: Path, include_docs: bool) -> list[str]:
    keep = []
    for rel in tracked(root):
        p = Path(rel)
        if p.suffix not in TEXT_EXT or p.name in EXCLUDE_NAMES:
            continue
        if p.suffix == ".md" and not include_docs:
            continue
        if rel.startswith(EXCLUDE_PREFIXES):
            continue
        if rel == ALIASES_REL or rel.startswith(MIGRATION_GLOB):
            continue  # these must keep the OLD names
        if rel.endswith("agentsam_tool_ids.py"):
            continue
        f = root / rel
        try:
            if not f.is_file() or f.stat().st_size > MAX_BYTES:
                continue
        except OSError:
            continue
        keep.append(rel)
    return keep


def read(root: Path, rel: str) -> str | None:
    try:
        with open(root / rel, encoding="utf-8", newline="") as fh:
            return fh.read()
    except (UnicodeDecodeError, OSError):
        return None


def token_re(keys: list[str]) -> re.Pattern[str]:
    alt = "|".join(sorted(map(re.escape, keys), key=len, reverse=True))
    # (?<![\w.]) also protects row ids like ast_fnf_media_library_list and dotted capability keys.
    return re.compile(rf"(?<![\w.])({alt})(?!\w)")


def area(rel: str) -> str:
    if rel.startswith("db/"):
        return "db"
    if rel.startswith(("tests/", "test/")) or "/tests/" in rel:
        return "tests"
    if "/frontend/" in rel:
        return "frontend"
    if "/backend/" in rel:
        return "backend"
    if rel.endswith(".md"):
        return "docs"
    return "other"


def cmd_audit(args: argparse.Namespace) -> None:
    root = repo_root()
    files = candidates(root, include_docs=True)
    pat = token_re([o for o, _ in MAPPING])
    per_key: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    leftovers: dict[str, int] = defaultdict(int)
    mapped = {o for o, _ in MAPPING}
    fnf = re.compile(r"(?<![\w.])fnf_[a-z0-9_]+")
    for rel in files:
        text = read(root, rel)
        if text is None:
            continue
        for m in pat.finditer(text):
            per_key[m.group(1)][area(rel)] += 1
        for m in fnf.finditer(text):
            if m.group(0) not in mapped:
                leftovers[m.group(0)] += 1
    print(f"{'old key':32} {'new wire key':32} total  by area")
    for old, op in MAPPING:
        areas = per_key.get(old, {})
        total = sum(areas.values())
        detail = ", ".join(f"{a}:{n}" for a, n in sorted(areas.items()))
        tier = " [operator]" if (old, op) in OPERATOR else ""
        print(f"{old:32} {wire(op):32} {total:5}  {detail}{tier}")
    unused = [o for o, _ in MAPPING if o not in per_key]
    if unused:
        print("\nmapped but never referenced in tracked files (live D1 only?):", ", ".join(unused))
    if leftovers:
        print("\nother fnf_* tokens (not renamed: workflows, prompts, scopes, env). Review by hand:")
        for tok, n in sorted(leftovers.items(), key=lambda kv: -kv[1])[:40]:
            print(f"  {n:4}  {tok}")
    collisions = []
    new_pat = token_re([wire(op) for _, op in MAPPING])
    for rel in files:
        text = read(root, rel)
        if text and new_pat.search(text):
            collisions.append(rel)
    if collisions:
        print("\nnew wire keys already appear in:", ", ".join(collisions[:10]),
              "(rename is still safe: only OLD keys are replaced)")


def cmd_rename(args: argparse.Namespace) -> None:
    root = repo_root()
    if args.apply and dirty(root) and not args.allow_dirty:
        sys.exit("working tree is dirty; commit/stash first so git can undo this, or pass --allow-dirty")
    table = {o: wire(op) for o, op in MAPPING}
    pat = token_re(list(table))
    total_files = total_hits = 0
    for rel in candidates(root, include_docs=args.docs):
        text = read(root, rel)
        if text is None:
            continue
        new_text, n = pat.subn(lambda m: table[m.group(1)], text)
        if not n:
            continue
        total_files += 1
        total_hits += n
        print(f"{'WROTE' if args.apply else 'would change':13} {n:4}  {rel}")
        if args.apply:
            with open(root / rel, "w", encoding="utf-8", newline="") as fh:
                fh.write(new_text)
    verb = "applied" if args.apply else "dry run"
    print(f"\n{verb}: {total_hits} replacements in {total_files} files")
    if not args.apply:
        print("re-run with --apply to write. Row ids (ast_*) are never renamed.")


def cmd_sql(args: argparse.Namespace) -> None:
    root = repo_root()
    stamp = datetime.date.today().strftime("%Y%m%d")
    out = root / f"{MIGRATION_GLOB}{stamp}.sql"
    if out.exists() and not args.force:
        sys.exit(f"{out.relative_to(root)} exists; pass --force to overwrite")
    lines = [
        "-- AgentSam tool keys -> neutral operation ids.",
        "-- Generated by scripts/agentsam_tool_ids.py. Review, then run against each DB yourself.",
        "-- tool_key and tool_name both become the provider-safe wire key (dotted id lives in code).",
        "-- Row ids (ast_*) and capability_key are intentionally untouched. Idempotent: a row is",
        "-- renamed only if the new key does not already exist.",
        "-- NOTE: any other table that stores tool_key (traces, workflow nodes) must be checked",
        "-- separately; run `agentsam_tool_ids.py audit` and grep db/ for those references.",
        "",
    ]
    for old, op in MAPPING:
        new = wire(op)
        lines.append(
            f"UPDATE agentsam_tools SET tool_key = '{new}', tool_name = '{new}', "
            f"updated_at = unixepoch() WHERE tool_key = '{old}' "
            f"AND NOT EXISTS (SELECT 1 FROM agentsam_tools WHERE tool_key = '{new}');"
        )
    lines += ["", "-- Merchant installs should not enable the operator tier. Optional, review first:"]
    for _, op in OPERATOR:
        lines.append(f"-- UPDATE agentsam_tools SET is_active = 0 WHERE tool_key = '{wire(op)}';")
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"wrote {out.relative_to(root)} ({len(MAPPING)} statements, not executed)")


TYPES_TS = """\
// Typed tool contract. Mirrors the SDK's AgentToolDefinition as a pinned, types-only snapshot
// (no runtime import from the SDK). Erasable syntax only, so Node and wrangler both load it.
import { assertOperationId, toWireName } from "./wire-names.ts";

export type ToolRisk = "low" | "moderate" | "high" | "critical";
export type ToolSideEffect =
  | "none"
  | "local_write"
  | "external_write"
  | "billable_external_write"
  | "destructive_possible";
export type ToolAudience = "merchant" | "operator";
export type ToolRole = "owner" | "admin" | "editor" | "viewer";

export interface AbortSignalLike {
  readonly aborted: boolean;
}

/** Built once per request from the authenticated session. Never from model arguments. */
export interface ToolContext {
  readonly accountId: string;
  readonly actorId: string;
  readonly role: ToolRole;
  readonly signal?: AbortSignalLike;
}

export interface ToolFailure {
  readonly code: string;
  readonly message: string;
}

/** Failures are results, not exceptions: the model needs them to retry. */
export type ToolResult<T = unknown> =
  | { readonly status: "ok"; readonly output: T }
  | { readonly status: "failed"; readonly error: ToolFailure; readonly output?: unknown }
  | { readonly status: "awaiting_confirmation"; readonly confirmationId: string; readonly preview: unknown }
  | { readonly status: "unavailable"; readonly reason: string };

export interface ToolDescriptor<I = unknown, O = unknown> {
  readonly operationId: string;
  readonly wireName: string;
  readonly capabilityKey: string;
  readonly description: string;
  readonly inputSchema: Readonly<Record<string, unknown>>;
  readonly riskLevel: ToolRisk;
  readonly sideEffect: ToolSideEffect;
  readonly requiresConfirmation: boolean;
  readonly audience: ToolAudience;
  readonly run: (input: I, ctx: ToolContext) => Promise<ToolResult<O>>;
}

/** Fails at import time, not at the first model call. */
export function defineTool<I, O>(descriptor: ToolDescriptor<I, O>): ToolDescriptor<I, O> {
  assertOperationId(descriptor.operationId);
  if (descriptor.wireName !== toWireName(descriptor.operationId)) {
    throw new Error(`tool_wire_name_mismatch:${descriptor.operationId}`);
  }
  if (descriptor.audience === "operator" && !descriptor.operationId.startsWith("operator.")) {
    throw new Error(`operator_tool_must_use_operator_namespace:${descriptor.operationId}`);
  }
  if (descriptor.sideEffect !== "none" && !descriptor.requiresConfirmation && descriptor.riskLevel !== "low") {
    throw new Error(`side_effecting_tool_needs_confirmation:${descriptor.operationId}`);
  }
  return descriptor;
}
"""

WIRE_TS = """\
// Operation ids are dotted and product-neutral. Providers only accept [a-zA-Z0-9_-], so the
// model sees the wire name. The registry keeps an explicit wire -> id map; never parse names back.
const OPERATION_ID = /^[a-z][a-z0-9]*(\\.[a-z][a-z0-9_]*)+$/;
const WIRE_NAME = /^[a-zA-Z0-9_-]{1,64}$/;

export function assertOperationId(id: string): void {
  if (!OPERATION_ID.test(id)) throw new Error(`invalid_operation_id:${id}`);
  if (!WIRE_NAME.test(toWireName(id))) throw new Error(`operation_id_not_wire_safe:${id}`);
}

export function toWireName(id: string): string {
  return id.replaceAll(".", "_");
}

/** Throws on collisions so two operations can never share a wire name. */
export function buildWireIndex(ids: readonly string[]): ReadonlyMap<string, string> {
  const index = new Map<string, string>();
  for (const id of ids) {
    assertOperationId(id);
    const wireName = toWireName(id);
    const existing = index.get(wireName);
    if (existing !== undefined && existing !== id) {
      throw new Error(`wire_name_collision:${wireName}:${existing}:${id}`);
    }
    index.set(wireName, id);
  }
  return index;
}
"""

TSCONFIG = """\
{
  "compilerOptions": {
    "target": "es2023",
    "lib": ["ES2023"],
    "module": "esnext",
    "moduleResolution": "bundler",
    "types": [],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noFallthroughCasesInSwitch": true,
    "verbatimModuleSyntax": true,
    "erasableSyntaxOnly": true,
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["./**/*.ts"]
}
"""

TEST_MJS = """\
import test from "node:test";
import assert from "node:assert/strict";
import { buildWireIndex, toWireName, assertOperationId } from "../backend/tools/wire-names.ts";
import { defineTool } from "../backend/tools/types.ts";
import { LEGACY_TOOL_KEYS, resolveLegacyToolKey } from "../backend/tools/legacy-aliases.ts";

const base = {
  capabilityKey: "media.image.optimize",
  description: "x",
  inputSchema: { type: "object" },
  riskLevel: "low",
  sideEffect: "none",
  requiresConfirmation: false,
  audience: "merchant",
  run: async () => ({ status: "ok", output: null }),
};

test("wire names are provider-safe and collisions fail fast", () => {
  assert.equal(toWireName("media.image.optimize"), "media_image_optimize");
  assert.throws(() => assertOperationId("Media.Image"), /invalid_operation_id/);
  assert.throws(() => buildWireIndex(["a.b_c", "a.b.c"]), /wire_name_collision/);
});

test("defineTool rejects inconsistent descriptors at import time", () => {
  assert.throws(() => defineTool({ ...base, operationId: "media.image.optimize", wireName: "nope" }),
    /tool_wire_name_mismatch/);
  assert.throws(() => defineTool({ ...base, operationId: "database.query", wireName: "database_query", audience: "operator" }),
    /operator_tool_must_use_operator_namespace/);
  assert.throws(() => defineTool({ ...base, operationId: "media.image.optimize", wireName: "media_image_optimize",
    sideEffect: "external_write", riskLevel: "high" }), /side_effecting_tool_needs_confirmation/);
  assert.ok(defineTool({ ...base, operationId: "media.image.optimize", wireName: "media_image_optimize" }));
});

test("legacy fnf_* keys resolve to wire-safe, collision-free keys", () => {
  const wires = Object.values(LEGACY_TOOL_KEYS);
  assert.equal(new Set(wires).size, wires.length);
  for (const [old, next] of Object.entries(LEGACY_TOOL_KEYS)) {
    assert.equal(resolveLegacyToolKey(old), next);
    assert.match(next, /^[a-z][a-z0-9_]*$/);
  }
  assert.equal(resolveLegacyToolKey("already_new_key"), "already_new_key");
});
"""


def aliases_ts() -> str:
    rows = ",\n".join(f'  {old}: "{wire(op)}"' for old, op in MAPPING)
    ops = ",\n".join(f'  {wire(op)}: "{op}"' for _, op in MAPPING)
    return (
        "// GENERATED by scripts/agentsam_tool_ids.py. Old FNF keys -> wire keys, so existing\n"
        "// D1 rows, saved conversations and traces keep resolving during the migration.\n"
        "export const LEGACY_TOOL_KEYS=[REDACTED] + rows + ",\n} as const;\n\n"
        "export const OPERATION_ID_BY_WIRE = {\n" + ops + ",\n} as const;\n\n"
        "export function resolveLegacyToolKey(key: string): string {\n"
        "  return Object.hasOwn(LEGACY_TOOL_KEYS, key)\n"
        "    ? LEGACY_TOOL_KEYS[key as keyof typeof LEGACY_TOOL_KEYS]\n"
        "    : key;\n"
        "}\n"
    )


def cmd_scaffold(args: argparse.Namespace) -> None:
    root = repo_root()
    app = root / "apps" / "ecommerce-cms-agentsam"
    if not app.is_dir():
        sys.exit("apps/ecommerce-cms-agentsam not found")
    files = {
        app / "backend/tools/types.ts": TYPES_TS,
        app / "backend/tools/wire-names.ts": WIRE_TS,
        app / "backend/tools/tsconfig.json": TSCONFIG,
        app / "backend/tools/legacy-aliases.ts": aliases_ts(),
        app / "tests/tools-kernel.test.mjs": TEST_MJS,
    }
    clash = [p for p in files if p.exists() and not (args.force and p.name == "legacy-aliases.ts")]
    if clash:
        sys.exit("refusing to overwrite: " + ", ".join(str(p.relative_to(root)) for p in clash))
    for path, body in files.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(body, encoding="utf-8")
        print("created", path.relative_to(root))
    print(
        "\nnext:\n"
        "  cd apps/ecommerce-cms-agentsam && npm i -D typescript   # app-level devDependency (standalone install)\n"
        "  npx tsc -p backend/tools                                 # strict typecheck, fails fast\n"
        "  node --test tests/tools-kernel.test.mjs                  # Node 22.18+ loads .ts natively\n"
        "add both commands to package.json `scripts.test:tools` so CI runs them."
    )


def main() -> None:
    sanity_check()
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("audit").set_defaults(fn=cmd_audit)
    r = sub.add_parser("rename")
    r.add_argument("--apply", action="store_true")
    r.add_argument("--allow-dirty", action="store_true")
    r.add_argument("--docs", action="store_true", help="also rewrite .md files")
    r.set_defaults(fn=cmd_rename)
    s = sub.add_parser("sql")
    s.add_argument("--force", action="store_true")
    s.set_defaults(fn=cmd_sql)
    c = sub.add_parser("scaffold")
    c.add_argument("--force", action="store_true", help="regenerate legacy-aliases.ts only")
    c.set_defaults(fn=cmd_scaffold)
    args = ap.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
