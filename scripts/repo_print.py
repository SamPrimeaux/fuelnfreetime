#!/usr/bin/env python3
"""
repo_print.py — cheap, deterministic repository labeling / topology printer.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass, asdict
from pathlib import Path

TEXT_EXTS = {
    ".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx",
    ".py", ".sh", ".sql", ".md", ".txt", ".json", ".jsonc",
    ".html", ".css", ".scss", ".yaml", ".yml", ".toml",
    ".xml", ".svg", ".env", ".ini", ".cfg",
}

GENERATED_MIRRORS = {
    "apps/ecommerce-cms-agentsam/frontend/shell.js":
        ["public/admin/js/shell.js"],
    "apps/ecommerce-cms-agentsam/frontend/inspector.js":
        ["public/admin/js/inspector.js"],
    "app/frontend/admin/agentsam/agentsam.html":
        ["public/admin/agentsam.html"],
    "app/frontend/admin/agentsam/agentsam-page.css":
        ["public/admin/css/agentsam-page.css"],
    "app/frontend/admin/agentsam/agentsam-page.js":
        ["public/admin/js/agentsam-page.js"],
}

GENERATED_TO_CANONICAL = {
    generated: canonical
    for canonical, generated_list in GENERATED_MIRRORS.items()
    for generated in generated_list
}

SUBSYSTEM_RULES = [
    (r"^src/index\.js$", "worker-router"),
    (r"^src/admin/", "admin-backend"),
    (r"^src/store/", "commerce-runtime"),
    (r"^src/cms/", "cms-runtime"),
    (r"^src/completeful/", "completeful-provider"),
    (r"^src/webhooks/", "webhooks"),
    (r"^src/agentsam/", "agentsam-compat"),
    (r"^src/do/", "collaboration-runtime"),
    (r"^src/lib/", "runtime-lib"),
    (r"^app/backend/agentsam/", "agentsam-backend"),
    (r"^app/backend/admin/agentsam\.js$", "agentsam-backend"),
    (r"^app/frontend/admin/agentsam/", "agentsam-frontend"),
    (r"^app/frontend/admin/home/", "admin-home-donor"),
    (r"^apps/ecommerce-cms-agentsam/", "ecommerce-app-package"),
    (r"^admin-ui/src/layout/", "admin-spa-shell"),
    (r"^admin-ui/src/pages/analytics/", "analytics-ui"),
    (r"^admin-ui/src/pages/products/", "product-studio-ui"),
    (r"^admin-ui/src/", "admin-spa"),
    (r"^public/admin/", "admin-runtime-assets"),
    (r"^public/js/", "storefront-runtime"),
    (r"^public/css/", "storefront-styles"),
    (r"^public/(index|shop|product|cart|about|community|order-confirmation)\.html$", "storefront-pages"),
    (r"^db/", "database"),
    (r"^scripts/", "ops-scripts"),
    (r"^skills/", "skills"),
    (r"^docs/", "docs"),
    (r"^test/", "tests"),
    (r"^legacy/", "legacy"),
    (r"^FuelnFreeTime/", "legacy-or-donor-app"),
    (r"^design/", "design-reference"),
    (r"^\.cursor/", "developer-skills"),
]

ROLE_RULES = [
    (r"(^|/)migrate[^/]*\.sql$", "migration"),
    (r"(^|/)seed[^/]*\.sql$", "seed"),
    (r"(^|/)patch[^/]*\.sql$", "patch"),
    (r"(^|/)test[^/]*|\.test\.", "test"),
    (r"(^|/)README\.md$|^docs/", "documentation"),
    (r"(^|/)SKILL\.md$", "skill"),
    (r"^scripts/", "script"),
    (r"\.(css|scss)$", "style"),
    (r"\.(html)$", "view"),
    (r"\.(js|mjs|cjs|ts|tsx|jsx)$", "code"),
    (r"\.(sql)$", "database"),
    (r"\.(json|jsonc|toml|yaml|yml)$", "config-or-data"),
    (r"\.(png|jpg|jpeg|webp|gif|avif|ico|woff2|woff|ttf|otf|glb|gltf|mp4|webm)$", "asset"),
]

INTENT_TAGS = {
    "theme": re.compile(r"(theme|heuristic)", re.I),
    "template": re.compile(r"(template|preset)", re.I),
    "editor": re.compile(r"(editor|inspector|cms-live|page-edit)", re.I),
    "nav": re.compile(r"(nav|shell|sidebar|drawer)", re.I),
    "stripe": re.compile(r"stripe", re.I),
    "email": re.compile(r"(resend|mail|email|campaign)", re.I),
    "completeful": re.compile(r"completeful", re.I),
    "analytics": re.compile(r"(analytics|finance|growth|attribution)", re.I),
    "storefront": re.compile(r"(store|shop|product|cart|community|about)", re.I),
    "agent": re.compile(r"agentsam", re.I),
    "legacy": re.compile(r"(legacy|donor|backup|archive)", re.I),
}

IMPORT_RE = re.compile(
    r"""(?:
        import\s+(?:[^'"]+\s+from\s+)?['"]([^'"]+)['"]
      | require\(\s*['"]([^'"]+)['"]\s*\)
      | export\s+[^'"]+\s+from\s+['"]([^'"]+)['"]
    )""",
    re.X,
)


def run_git(root: Path, *args: str, check: bool = True) -> bytes:
    proc = subprocess.run(
        ["git", "-C", str(root), *args],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if check and proc.returncode != 0:
        raise RuntimeError(proc.stderr.decode("utf-8", "replace").strip())
    return proc.stdout


def tracked_files(root: Path) -> list[str]:
    raw = run_git(root, "ls-files", "-z")
    return [x for x in raw.decode("utf-8", "surrogateescape").split("\0") if x]


def git_root(path: Path) -> Path:
    out = subprocess.run(
        ["git", "-C", str(path), "rev-parse", "--show-toplevel"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
        text=True,
    )
    if out.returncode != 0:
        raise SystemExit(f"Not a git repository: {path}")
    return Path(out.stdout.strip()).resolve()


def git_status(root: Path) -> dict[str, str]:
    raw = run_git(root, "status", "--porcelain=v1", "-z", check=False)
    entries = raw.decode("utf-8", "surrogateescape").split("\0")
    status: dict[str, str] = {}
    i = 0
    while i < len(entries):
        entry = entries[i]
        if not entry:
            i += 1
            continue
        code = entry[:2]
        path = entry[3:]
        if code[0] in {"R", "C"} and i + 1 < len(entries):
            new_path = entries[i + 1]
            if new_path:
                path = new_path
                i += 1
        status[path] = code
        i += 1
    return status


def current_branch(root: Path) -> str:
    return run_git(root, "branch", "--show-current", check=False).decode().strip()


def head_commit(root: Path) -> str:
    return run_git(root, "rev-parse", "--short=12", "HEAD", check=False).decode().strip()


def remote_head(root: Path) -> str:
    return run_git(root, "rev-parse", "--short=12", "origin/main", check=False).decode().strip()


def classify_subsystem(path: str) -> str:
    for pattern, label in SUBSYSTEM_RULES:
        if re.search(pattern, path):
            return label
    return "other"


def classify_role(path: str) -> str:
    if path in GENERATED_TO_CANONICAL:
        return "generated-mirror"
    if path.startswith("legacy/"):
        return "legacy"
    for pattern, label in ROLE_RULES:
        if re.search(pattern, path, flags=re.I):
            return label
    return "other"


def canonicality(path: str):
    if path in GENERATED_TO_CANONICAL:
        return "generated", GENERATED_TO_CANONICAL[path]
    if path.startswith("src/agentsam/"):
        app_equiv = "app/backend/" + path[len("src/"):]
        return "compatibility", app_equiv
    if path.startswith("public/admin/_spa/"):
        return "built-output", "admin-ui/src/**"
    if path.startswith("legacy/"):
        return "legacy", None
    if path.startswith("FuelnFreeTime/"):
        return "donor-or-legacy", None
    if path.startswith("public/"):
        return "runtime-static", None
    return "canonical-or-direct", None


def is_text_file(path: Path) -> bool:
    return path.suffix.lower() in TEXT_EXTS or path.name in {
        "Dockerfile", "Makefile", ".gitignore", ".env.example",
    }


def text_stats(path: Path):
    if not path.exists() or not path.is_file() or not is_text_file(path):
        return None, None, []
    try:
        raw = path.read_bytes()
    except OSError:
        return None, None, []
    if b"\x00" in raw[:8192]:
        return None, None, []
    text = raw.decode("utf-8", "replace")
    lines = text.count("\n") + (1 if text and not text.endswith("\n") else 0)
    imports = []
    if path.suffix.lower() in {".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx"}:
        for match in IMPORT_RE.finditer(text):
            target = next((g for g in match.groups() if g), None)
            if target:
                imports.append(target)
    return lines, len(imports), sorted(set(imports))


def sha256_file(path: Path):
    try:
        h = hashlib.sha256()
        with path.open("rb") as f:
            for chunk in iter(lambda: f.read(1024 * 1024), b""):
                h.update(chunk)
        return h.hexdigest()
    except OSError:
        return None


@dataclass
class FileRecord:
    path: str
    subsystem: str
    role: str
    canonicality: str
    canonical_source: str | None
    git_status: str
    size_bytes: int
    lines: int | None
    import_count: int | None
    imports: list[str]
    intent_tags: list[str]
    sha256: str | None = None


def record_for(root: Path, rel: str, statuses: dict[str, str], want_hash: bool) -> FileRecord:
    p = root / rel
    try:
        size = p.stat().st_size
    except OSError:
        size = 0
    lines, import_count, imports = text_stats(p)
    canon, source = canonicality(rel)
    tags = [name for name, rx in INTENT_TAGS.items() if rx.search(rel)]
    return FileRecord(
        path=rel,
        subsystem=classify_subsystem(rel),
        role=classify_role(rel),
        canonicality=canon,
        canonical_source=source,
        git_status=statuses.get(rel, ""),
        size_bytes=size,
        lines=lines,
        import_count=import_count,
        imports=imports,
        intent_tags=tags,
        sha256=sha256_file(p) if want_hash else None,
    )


def compact_bytes(n: int) -> str:
    if n < 1024:
        return f"{n} B"
    if n < 1024**2:
        return f"{n / 1024:.1f} KiB"
    return f"{n / 1024**2:.1f} MiB"


def build_summary(records: list[FileRecord]) -> dict:
    subsystems = Counter(r.subsystem for r in records)
    roles = Counter(r.role for r in records)
    canonicality_counts = Counter(r.canonicality for r in records)
    changed = [r for r in records if r.git_status]
    text_lines = sum(r.lines or 0 for r in records)
    total_size = sum(r.size_bytes for r in records)

    generated = [
        {"generated": r.path, "canonical": r.canonical_source}
        for r in records if r.canonicality == "generated"
    ]
    return {
        "files": len(records),
        "text_lines": text_lines,
        "total_size_bytes": total_size,
        "changed_files": len(changed),
        "subsystems": dict(subsystems.most_common()),
        "roles": dict(roles.most_common()),
        "canonicality": dict(canonicality_counts.most_common()),
        "generated_mirrors": generated,
    }


def duplicate_groups(records: list[FileRecord]) -> list[dict]:
    groups: dict[tuple[int, str], list[str]] = defaultdict(list)
    for r in records:
        if r.sha256 and r.size_bytes > 0:
            groups[(r.size_bytes, r.sha256)].append(r.path)
    out = []
    for (size, digest), paths in groups.items():
        if len(paths) > 1:
            out.append({"size_bytes": size, "sha256": digest, "paths": sorted(paths)})
    return sorted(out, key=lambda x: (-x["size_bytes"], x["paths"][0]))


def render_brief(root, branch, head, origin_main, records, dups) -> str:
    summary = build_summary(records)
    changed = [r for r in records if r.git_status]
    by_subsystem: dict[str, list[FileRecord]] = defaultdict(list)
    for r in records:
        by_subsystem[r.subsystem].append(r)

    lines = []
    lines.append(f"REPO {root}")
    lines.append(f"BRANCH {branch or '(detached)'}  HEAD {head or '?'}  origin/main {origin_main or '?'}")
    lines.append(
        f"TRACKED {summary['files']} files | "
        f"{summary['text_lines']:,} text lines | "
        f"{compact_bytes(summary['total_size_bytes'])} | "
        f"{summary['changed_files']} changed"
    )
    lines.append("")
    lines.append("CANONICAL OWNERSHIP / SUBSYSTEMS")
    for name, count in summary["subsystems"].items():
        subset = by_subsystem[name]
        line_count = sum(r.lines or 0 for r in subset)
        lines.append(f"- {name}: {count} files, {line_count:,} text lines")
    lines.append("")
    lines.append("GENERATED / COMPATIBILITY EDGES")
    if summary["generated_mirrors"]:
        for item in summary["generated_mirrors"]:
            lines.append(f"- {item['canonical']} -> {item['generated']}")
    else:
        lines.append("- none detected")
    lines.append("")
    lines.append("CHANGED FILES")
    if changed:
        for r in changed:
            lines.append(f"- [{r.git_status}] {r.path} :: {r.subsystem}/{r.role}")
    else:
        lines.append("- clean working tree")
    lines.append("")
    lines.append("HIGH-SIGNAL FILES")
    priority_tags = ("theme", "editor", "nav", "stripe", "email", "completeful", "analytics")
    candidates = [
        r for r in records
        if any(tag in r.intent_tags for tag in priority_tags)
        and r.canonicality not in {"generated", "built-output"}
    ]
    candidates.sort(key=lambda r: (0 if r.canonicality == "canonical-or-direct" else 1, r.subsystem, r.path))
    for r in candidates[:80]:
        tags = ",".join(r.intent_tags)
        lines.append(f"- {r.path} [{r.subsystem}; {r.role}; {tags}]")
    if len(candidates) > 80:
        lines.append(f"- ... {len(candidates) - 80} more high-signal files omitted")
    if dups:
        lines.append("")
        lines.append("EXACT DUPLICATE GROUPS (review, do not auto-delete)")
        for g in dups[:20]:
            lines.append(f"- {compact_bytes(g['size_bytes'])}: " + " | ".join(g["paths"]))
        if len(dups) > 20:
            lines.append(f"- ... {len(dups) - 20} more duplicate groups omitted")
    return "\n".join(lines) + "\n"


def render_markdown(root, branch, head, records, dups) -> str:
    summary = build_summary(records)
    by_subsystem: dict[str, list[FileRecord]] = defaultdict(list)
    for r in records:
        by_subsystem[r.subsystem].append(r)

    out = [
        "# Repository machine map", "",
        f"- Root: `{root}`",
        f"- Branch: `{branch or '(detached)'}`",
        f"- HEAD: `{head or '?'}`",
        f"- Tracked files: **{summary['files']}**",
        f"- Text lines: **{summary['text_lines']:,}**",
        f"- Size: **{compact_bytes(summary['total_size_bytes'])}**",
        f"- Changed tracked files: **{summary['changed_files']}**",
        "", "## Canonical / generated edges", "",
    ]
    mirrors = summary["generated_mirrors"]
    if mirrors:
        for m in mirrors:
            out.append(f"- `{m['canonical']}` → `{m['generated']}`")
    else:
        out.append("- None detected.")
    out += ["", "## Subsystems", ""]

    for subsystem, count in summary["subsystems"].items():
        subset = sorted(by_subsystem[subsystem], key=lambda r: r.path)
        out.append(f"### {subsystem} ({count})")
        out.append("")
        for r in subset:
            flags = [r.role, r.canonicality]
            if r.git_status:
                flags.append(f"git:{r.git_status}")
            if r.intent_tags:
                flags.append("tags:" + ",".join(r.intent_tags))
            metric = f"{r.lines:,} lines" if r.lines is not None else compact_bytes(r.size_bytes)
            out.append(f"- `{r.path}` — {metric} — {'; '.join(flags)}")
        out.append("")

    if dups:
        out += ["## Exact duplicate groups", "", "> Review only; this report never auto-deletes files.", ""]
        for g in dups:
            out.append(f"- **{compact_bytes(g['size_bytes'])}** `{g['sha256'][:12]}`")
            for p in g["paths"]:
                out.append(f"  - `{p}`")
        out.append("")

    return "\n".join(out)


def write_tsv(path: Path, records: list[FileRecord]) -> None:
    header = ["path", "subsystem", "role", "canonicality", "canonical_source",
              "git_status", "size_bytes", "lines", "import_count", "intent_tags"]
    lines = ["\t".join(header)]
    for r in records:
        vals = [
            r.path, r.subsystem, r.role, r.canonicality, r.canonical_source or "",
            r.git_status, str(r.size_bytes), "" if r.lines is None else str(r.lines),
            "" if r.import_count is None else str(r.import_count),
            ",".join(r.intent_tags),
        ]
        lines.append("\t".join(v.replace("\t", " ") for v in vals))
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser(description="Machine-print and label a git repository.")
    ap.add_argument("repo", nargs="?", default=".", help="Repository path (default: .)")
    ap.add_argument("--out", default=".repo-intel", help="Output directory (default: .repo-intel)")
    ap.add_argument("--subtree", help="Only include tracked files under this relative path")
    ap.add_argument("--changed", action="store_true", help="Only include currently changed tracked files")
    ap.add_argument("--duplicates", action="store_true", help="Hash files and report exact duplicates")
    ap.add_argument("--print", choices=["brief", "md", "json", "tsv", "none"], default="brief")
    args = ap.parse_args()

    root = git_root(Path(args.repo).resolve())
    statuses = git_status(root)
    files = tracked_files(root)

    if args.subtree:
        prefix = args.subtree.strip("/").rstrip("/") + "/"
        exact = args.subtree.strip("/")
        files = [p for p in files if p == exact or p.startswith(prefix)]

    if args.changed:
        files = [p for p in files if p in statuses]

    records = [record_for(root, rel, statuses, args.duplicates) for rel in files]
    records.sort(key=lambda r: r.path)

    branch = current_branch(root)
    head = head_commit(root)
    origin_main = remote_head(root)
    dups = duplicate_groups(records) if args.duplicates else []
    summary = build_summary(records)

    out_dir = Path(args.out)
    if not out_dir.is_absolute():
        out_dir = root / out_dir
    out_dir.mkdir(parents=True, exist_ok=True)

    payload = {
        "schema_version": 1,
        "repository": {"root": str(root), "branch": branch, "head": head, "origin_main": origin_main},
        "summary": summary,
        "generated_mirror_contract": GENERATED_MIRRORS,
        "duplicates": dups,
        "files": [asdict(r) for r in records],
    }

    json_path = out_dir / "repo-map.json"
    md_path = out_dir / "repo-map.md"
    brief_path = out_dir / "repo-brief.txt"
    tsv_path = out_dir / "repo-files.tsv"

    json_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    md_path.write_text(render_markdown(root, branch, head, records, dups), encoding="utf-8")
    brief_path.write_text(render_brief(root, branch, head, origin_main, records, dups), encoding="utf-8")
    write_tsv(tsv_path, records)

    selected = {"brief": brief_path, "md": md_path, "json": json_path, "tsv": tsv_path}
    if args.print != "none":
        sys.stdout.write(selected[args.print].read_text(encoding="utf-8"))

    sys.stderr.write(f"\nWrote:\n  {brief_path}\n  {md_path}\n  {json_path}\n  {tsv_path}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
