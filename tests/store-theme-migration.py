#!/usr/bin/env python3
import json
import sqlite3
from pathlib import Path

root = Path(__file__).resolve().parents[1]
sql = (root / "db/migrate-store-themes.sql").read_text()
conn = sqlite3.connect(":memory:")
conn.execute("PRAGMA foreign_keys = ON")

# The migration must be safe to rerun.
conn.executescript(sql)
conn.executescript(sql)

rows = conn.execute("SELECT id, slug, state, metadata_json FROM store_themes ORDER BY id").fetchall()
assert len(rows) == 2, rows
states = {slug: state for _, slug, state, _ in rows}
assert states == {"heuristic": "active", "revise": "draft"}, states

revise_meta = json.loads(next(meta for _, slug, _, meta in rows if slug == "revise"))
assert revise_meta["publishReady"] == 0
assert revise_meta["runtimeReady"] == 0

assert conn.execute("SELECT COUNT(*) FROM store_themes WHERE state='active'").fetchone()[0] == 1
assert conn.execute("SELECT COUNT(*) FROM store_theme_events").fetchone()[0] == 2

try:
    conn.execute(
        "INSERT INTO store_themes(id,slug,name,package_name,state,editor_mode) VALUES (?,?,?,?,?,?)",
        ("theme_bad", "bad", "Bad", "bad", "active", "package"),
    )
except sqlite3.IntegrityError:
    pass
else:
    raise AssertionError("second active theme was accepted")

columns = {row[1] for row in conn.execute("PRAGMA table_info(store_theme_pages)")}
for required in {"theme_id", "slug", "document_json", "media_json", "shell_json", "version"}:
    assert required in columns, required

print("store theme migration: PASS")
