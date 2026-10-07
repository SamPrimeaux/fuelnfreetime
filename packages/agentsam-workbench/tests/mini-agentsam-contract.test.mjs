import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../src/mini-agentsam.js', import.meta.url), 'utf8');

test('focusing the prompt does not implicitly expand miniAgentSam', () => {
  assert.doesNotMatch(source, /input\.addEventListener\(['"]focus['"],\s*expand\)/);
  assert.match(source, /class="more"/);
  assert.match(source, /setExpanded\(!expanded\)/);
});

test('explicit tools expansion does not widen the portable composer', () => {
  assert.match(source, /\.composer\{[^}]*width:240px/);
  assert.doesNotMatch(source, /\.composer\.expanded\{[^}]*width:/);
  assert.match(source, /\.expanded textarea\{height:52px\}/);
});
