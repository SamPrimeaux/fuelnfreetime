#!/usr/bin/env node
// Generated Completeful contract for the real Worker client, not a browser proxy.
// The pinned vendor OpenAPI is the source of truth: do not hand-edit the output.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = new URL('../../', import.meta.url);
const input = new URL('docs/providers/completeful/openapi.json', root);
const output = new URL('apps/ecommerce-cms-agentsam/backend/completeful/operations.generated.js', root);
const specBytes = readFileSync(input);
const spec = JSON.parse(specBytes);
const names = `
GET /referrals/summary referrals.summary
GET /referrals/tier1 referrals.tier1
GET /referrals/tier2 referrals.tier2
GET /referrals/payouts referrals.payouts
GET /shops shops.list
POST /shops shops.create
GET /shops/{shopId} shops.get
DELETE /shops/{shopId}/connection shops.disconnect
GET /catalog/products catalog.products
GET /catalog/products/semantic catalog.semantic
GET /catalog/products/{productId} catalog.product
GET /catalog/products/{productId}/variants catalog.variants
GET /catalog/products/{productId}/print-locations catalog.printLocations
GET /catalog/products/{productId}/mockups catalog.mockups
GET /catalog/products/{productId}/shipping catalog.shipping
POST /addresses/validate addresses.validate
POST /print-files/validate printFiles.validate
GET /designs designs.list
POST /designs designs.create
GET /designs/exports/{exportId} designs.getExport
POST /designs/{designId}/exports designs.createExport
GET /designs/{designId} designs.get
PATCH /designs/{designId} designs.update
DELETE /designs/{designId} designs.delete
POST /assets assets.create
POST /assets/from-url assets.fromUrl
GET /assets/{assetId} assets.get
GET /shops/{shopId}/products products.list
POST /shops/{shopId}/products products.create
GET /shops/{shopId}/products/{productId} products.get
PATCH /shops/{shopId}/products/{productId} products.update
DELETE /shops/{shopId}/products/{productId} products.delete
POST /shops/{shopId}/products/{productId}/publish products.publish
POST /shops/{shopId}/products/{productId}/publishing_succeeded products.ackPublishSuccess
POST /shops/{shopId}/products/{productId}/publishing_failed products.ackPublishFailure
POST /shops/{shopId}/products/{productId}/unpublish products.unpublish
GET /shops/{shopId}/orders orders.list
POST /shops/{shopId}/orders orders.create
GET /shops/{shopId}/orders/{orderId} orders.get
POST /shops/{shopId}/orders/{orderId}/cancel orders.cancel
GET /shops/{shopId}/webhooks webhooks.list
POST /shops/{shopId}/webhooks webhooks.create
GET /shops/{shopId}/webhooks/{webhookId} webhooks.get
PATCH /shops/{shopId}/webhooks/{webhookId} webhooks.update
DELETE /shops/{shopId}/webhooks/{webhookId} webhooks.delete
POST /shops/{shopId}/webhooks/{webhookId}/test webhooks.test
GET /shops/{shopId}/webhooks/{webhookId}/deliveries webhooks.deliveries
POST /mockups/renders mockups.render
GET /mockups/renders/{renderId} mockups.getRender
GET /catalog/products/by-sku/{sku} catalog.bySku
GET /catalog/products/{productId}/assets catalog.assets
POST /shops/{shopId}/orders/quote orders.quote
GET /shops/{shopId}/orders/lookup/{externalOrderId} orders.lookup
POST /shops/{shopId}/webhooks/{webhookId}/rotate-secret webhooks.rotateSecret
POST /shops/{shopId}/webhooks/{webhookId}/deliveries/{deliveryId}/redeliver webhooks.redeliver
`.trim().split('\n').map(line => {
  const [method, path, name] = line.trim().split(/\s+/);
  return { method, path, name };
});
const pathMethods = [];
for (const [path, methods] of Object.entries(spec.paths)) {
  for (const method of Object.keys(methods)) {
    if (['get','post','put','patch','delete'].includes(method)) pathMethods.push(method.toUpperCase() + ' ' + path);
  }
}
const keySet = new Set(names.map(v => v.method + ' ' + v.path));
if (keySet.size !== names.length || pathMethods.some(key => !keySet.has(key)) ||
  pathMethods.length !== names.length || new Set(names.map(x=>x.name)).size !== names.length)
  throw new Error('Completeful operation map does not exactly cover OpenAPI paths: ' +
    JSON.stringify(pathMethods.filter(key => !keySet.has(key))));
function resolveRef(value) {
  if (!value?.$ref) return value || {};
  const parts = value.$ref.split('/');
  if (parts[0] !== '#' || parts[1] !== 'components') throw new Error('Unsupported OpenAPI reference ' + value.$ref);
  return parts.slice(1).reduce((node, part) => node?.[part], spec) || {};
}
const definitions = {};
for (const {method, path, name} of names) {
  const operation = spec.paths[path][method.toLowerCase()];
  const params = [...(spec.paths[path].parameters || []), ...(operation.parameters || [])]
    .map(resolveRef).filter(p => p.name && p.in);
  const byPath = [...path.matchAll(/\{(\w+)\}/g)].map(match => match[1]);
  const query = params.filter(p=>p.in==='query');
  const bodySpec = operation.requestBody || {};
  const json = bodySpec.content?.['application/json']?.schema;
  const bodySchema = resolveRef(json);
  definitions[name] = {
    method, path, pathParams: byPath,
    queryParams: query.map(p=>p.name),
    requiredQuery: query.filter(p=>p.required).map(p=>p.name),
    querySchemas: Object.fromEntries(query.map(p=>[p.name,resolveRef(p.schema)])),
    bodyRequired: Boolean(bodySpec.required),
    bodySchema: json || null,
    requiredBodyFields: bodySchema.required || [],
    summary: operation.summary || '',
  };
}
const sha256 = createHash('sha256').update(specBytes).digest('hex');
const outputText = '// GENERATED by scripts/providers/generate-completeful-api.mjs. DO NOT EDIT.\n' +
  'export const COMPLETEFUL_CONTRACT = Object.freeze(' + JSON.stringify({
    title: spec.info.title, version: spec.info.version, sha256,
    operationCount: names.length, pathCount: Object.keys(spec.paths).length,
  }, null, 2) + ');\n' +
  'export const COMPLETEFUL_OPERATIONS = Object.freeze(' + JSON.stringify(definitions, null, 2) + ');\n';
if (process.argv.includes('--check')) {
  if (readFileSync(output,'utf8') !== outputText) throw new Error('Completeful client contract is stale. Run node scripts/providers/generate-completeful-api.mjs');
  process.stdout.write('Completeful OpenAPI contract current: '+names.length+' operations\n');
} else {
  writeFileSync(output, outputText);
  process.stdout.write('Generated '+names.length+' operations from '+Object.keys(spec.paths).length+' Completeful paths\n');
}
