import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync(new URL('../apps/ecommerce-cms-agentsam/frontend/static/js/brand-workspace.js', import.meta.url), 'utf8');

test('Brand has explicit loading and an actionable retry instead of a dead end', () => {
  assert.match(source, /if \(loaded \|\| loading\) return;/);
  assert.match(source, /brand-load-retry/);
  assert.match(source, /addEventListener\("click", load\)/);
  assert.match(source, /Nothing was changed/);
});
test('Save is disabled until authoritative brand data has loaded', () => {
  assert.match(source, /if \(save\) save\.disabled = true;/);
  assert.match(source, /if \(save\) save\.disabled = !loaded \|\| !dirty;/);
  assert.match(source, /brand-save-bottom/);
});
test('Brand reuses the shared parsed admin transport without treating it as native fetch', () => {
  assert.match(source, /const data = await adminFetch/);
  assert.doesNotMatch(source, /const response = await adminFetch/);
});
