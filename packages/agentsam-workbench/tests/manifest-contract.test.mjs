import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readJson = async (url) => JSON.parse(await readFile(url, 'utf8'));

test('workbench has one canonical app contract and a matching compatibility mirror', async () => {
  const canonical = await readJson(new URL('../agentsam.app.json', import.meta.url));
  const mirror = await readJson(new URL('../.agentsam/app.json', import.meta.url));
  assert.deepEqual(mirror, canonical);
  assert.equal(canonical.role, 'embedded-package');
  assert.equal(canonical.runtime.framework, 'agnostic');
  assert.ok(canonical.requires.includes('agentsam.resource.authorize'));
  assert.equal(canonical.mounts, undefined, 'delivery URLs are host concerns, not package identity');
});

test('mini composer feature is owned by the extracted package without a fake package version', async () => {
  const feature = await readJson(new URL('../agentsam.feature.json', import.meta.url));
  assert.equal(feature.id, 'agentsam.mini-composer');
  assert.equal(feature.status, 'extracted');
  assert.equal(feature.distribution.kind, 'package');
  assert.equal(feature.distribution.package, '@inneranimalmedia/agentsam-workbench');
  assert.equal(feature.version, undefined);
});
