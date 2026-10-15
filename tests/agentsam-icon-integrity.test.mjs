import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const manifest = JSON.parse(readFileSync(join(root, 'docs/brand/agentsam-canonical-icons.json'), 'utf8'));

test('AgentSam canonical sources are owned, named and independently archived', () => {
  assert.equal(manifest.owner, 'InnerAnimalMedia');
  assert.equal(manifest.product, 'AgentSam');
  assert.deepEqual(manifest.assets.map(a => a.id).sort(), [
    'agentsam.mascot.gorilla', 'agentsam.product.mark',
  ]);
  for (const asset of manifest.assets) {
    assert.match(asset.file, /^apps\/ecommerce-cms-agentsam\/frontend\/static\/brand\/agentsam-[\w-]+\.svg$/);
    assert.equal(asset.archive.bucket, 'brands');
    assert.match(asset.archive.key, /^inneranimalmedia\/agentsam\/identity\/v1\//);
    assert.match(asset.sha256, /^[a-f0-9]{64}$/);
  }
});

test('canonical icon bytes are unchanged and present', () => {
  for (const asset of manifest.assets) {
    const bytes = readFileSync(join(root, asset.file));
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    assert.equal(sha256, asset.sha256,
      asset.id + ' was altered. Preserve the original and add a separately named, versioned derivative.');
  }
});
