import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../src/mini-agentsam.js', import.meta.url), 'utf8');

test('focusing the prompt does not implicitly expand miniAgentSam', () => {
  assert.doesNotMatch(source, /input\.addEventListener\(['"]focus['"],\s*expand\)/);
  assert.match(source, /class="expand"/);
  assert.match(source, /class="more"/);
  assert.match(source, /setMessageExpanded\(!messageExpanded\)/);
  assert.match(source, /setToolsExpanded\(!toolsExpanded\)/);
});

test('message preview expands only from its explicit control without widening the composer', () => {
  assert.match(source, /\.composer\{[^}]*width:240px/);
  assert.doesNotMatch(source, /\.composer\.message-expanded\{[^}]*width:/);
  assert.match(source, /\.message-expanded textarea\{height:88px/);
  assert.match(source, /wrap="off"/);
});
