import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const readApp = async (id) => JSON.parse(await readFile(path.join(appRoot, 'apps', id, 'agentsam.app.json'), 'utf8'));

test('merchant Apps resolve domain capabilities instead of raw Cloudflare/D1/R2 power', async () => {
  for (const id of ['product-studio','growth','completeful','resend']) {
    const app = await readApp(id);
    const capabilityBlob = JSON.stringify(app.agent || {});
    assert.doesNotMatch(capabilityBlob, /\b(?:cf|d1|r2)\./, `${id} should not request low-level infrastructure capabilities directly`);
  }
});

test('Completeful policy preserves approval gates for order creation and product publishing', async () => {
  const app = await readApp('completeful');
  assert.deepEqual(app.agent.capabilities.approval_required, ['order.create','product.publish']);
  assert.ok(app.agent.capabilities.read.includes('order.quote'));
});

test('Product Studio consumes provider/domain capabilities without becoming Completeful-shaped', async () => {
  const app = await readApp('product-studio');
  assert.ok(app.agent.capabilities.read.includes('catalog.read'));
  assert.ok(app.agent.capabilities.write.includes('design.create'));
  assert.ok(!JSON.stringify(app.agent).includes('completeful_'));
});

test('Growth and Resend expose current registration gaps instead of pretending tool coverage exists', async () => {
  const growth = await readApp('growth');
  const resend = await readApp('resend');
  assert.equal(growth.agent.status, 'tool-registration-pending');
  assert.deepEqual(growth.agent.verified_tools, []);
  assert.equal(resend.agent.status, 'plugin-and-tool-registration-pending');
  assert.deepEqual(resend.agent.verified_tools, []);
});
