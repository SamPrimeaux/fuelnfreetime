import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { buildFnfReviseDraft, fnfReviseMedia } from '../apps/ecommerce-cms-agentsam/backend/themes/revise-fnf.js';

test('Revise is a real 24-section F&FT draft built from the packaged theme', () => {
  const page = buildFnfReviseDraft();
  assert.equal(page.theme, 'revise');
  assert.equal(page.sections.length, 24);
  const hero = page.sections.find((section) => section.preset === 'revise/sticky-curtain');
  assert.ok(hero);
  assert.equal(hero.data.heading, 'Time is the real horsepower.');
  assert.equal(hero.data.mediaKey, 'fnf.hero');
  assert.match(fnfReviseMedia['fnf.hero'], /earned-hours-hero\.webp$/);
  assert.equal(new Set(page.sections.map((section) => section.id)).size, page.sections.length);
});

test('Online Store publishes themes through theme lifecycle, never page publish', () => {
  const source = fs.readFileSync(new URL('../apps/ecommerce-cms-agentsam/frontend/static/store.html', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /\/api\/admin\/cms\/pages\/shop\/publish/);
  assert.match(source, /\/api\/admin\/store\/themes\/\$\{encodeURIComponent\(btn\.dataset\.themeId\)\}\/publish/);
});

test('package theme editor uses isolated workspace route', () => {
  const themes = fs.readFileSync(new URL('../apps/ecommerce-cms-agentsam/backend/admin/themes.js', import.meta.url), 'utf8');
  const routes = fs.readFileSync(new URL('../apps/ecommerce-cms-agentsam/backend/lib/admin-routes.js', import.meta.url), 'utf8');
  assert.match(themes, /\/admin\/theme-workspace\?theme=/);
  assert.match(routes, /"theme-workspace"/);
});

test('Revise publish remains fail-closed until review and runtime are both ready', () => {
  const themes = fs.readFileSync(new URL('../apps/ecommerce-cms-agentsam/backend/admin/themes.js', import.meta.url), 'utf8');
  assert.match(themes, /meta\.publishReady === 1 && meta\.runtimeReady === 1/);
});
