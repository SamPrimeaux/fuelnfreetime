import test from "node:test";
import assert from "node:assert/strict";
import { compareToBaseline, outOfTreeImports } from "../scripts/app-extraction-boundary.mjs";

test("the app never gains a new import that leaves its own tree (extraction ratchet)", () => {
  const { added, resolved } = compareToBaseline();
  assert.deepEqual(added, [], "new out-of-tree import: move the code into the app or declare a package dependency");
  assert.deepEqual(resolved, [], "baseline entry no longer exists: run node scripts/app-extraction-boundary.mjs --write");
});

test("everything that remains out of tree is a real package, not loose repo-root code", () => {
  for (const entry of outOfTreeImports()) {
    assert.match(entry.split(" -> ")[1], /^packages\//, `${entry} is loose repo-root code; it must move into the app`);
  }
});
