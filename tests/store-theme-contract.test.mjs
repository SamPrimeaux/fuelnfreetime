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

test('installed themes use the existing CMS Theme Studio, not a second workspace', () => {
  const canonical = fs.readFileSync(new URL('../apps/ecommerce-cms-agentsam/backend/cms/theme-authority.mjs', import.meta.url), 'utf8');
  const admin = fs.readFileSync(new URL('../apps/ecommerce-cms-agentsam/backend/admin/api.js', import.meta.url), 'utf8');
  assert.match(canonical, /cms_artifacts/);
  assert.match(canonical, /cms_globals/);
  assert.match(canonical, /\/admin\/theme-editor\?slug=shop/);
  assert.doesNotMatch(canonical, /FROM store_themes|FROM store_theme_pages/);
  assert.doesNotMatch(admin, /import \{ getThemePage, listThemePages/);
});

test('Revise installation stays a preview until its public runtime is verified', () => {
  const canonical = fs.readFileSync(new URL('../apps/ecommerce-cms-agentsam/backend/cms/theme-authority.mjs', import.meta.url), 'utf8');
  assert.match(canonical, /theme_runtime_not_verified/);
  assert.match(canonical, /runtime_ready: slug === DEFAULT/);
});
