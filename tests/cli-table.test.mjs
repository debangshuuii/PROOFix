import test from 'node:test';
import assert from 'node:assert/strict';
import { createBox, renderTable } from '../src/lib/cli/table.ts';
import { stripAnsi } from '../src/lib/cli/colors.ts';

test('table: createBox encloses content in border characters', () => {
  const content = ['Node.js: v22.1.0', 'Chromium: Ready', 'Ports: Available'];
  const box = createBox('PROOFix Diagnostics', content);
  const plain = stripAnsi(box);

  assert.ok(plain.includes('PROOFix Diagnostics'));
  assert.ok(plain.includes('Node.js: v22.1.0'));
  assert.ok(plain.includes('┌─'));
  assert.ok(plain.includes('└'));
  assert.ok(plain.includes('│'));
});

test('table: renderTable formats tabular data with aligned columns', () => {
  const columns = [
    { header: 'Check', key: 'name', align: 'left' },
    { header: 'Status', key: 'status', align: 'center' },
    { header: 'Latency', key: 'time', align: 'right' }
  ];

  const rows = [
    { name: 'Node.js Version', status: 'PASS', time: '2ms' },
    { name: 'Playwright Browser', status: 'PASS', time: '14ms' },
    { name: 'Ephemeral Ports', status: 'WARN', time: '52ms' }
  ];

  const table = renderTable(columns, rows);
  const plain = stripAnsi(table);

  assert.ok(plain.includes('Check'));
  assert.ok(plain.includes('Status'));
  assert.ok(plain.includes('Latency'));
  assert.ok(plain.includes('Node.js Version'));
  assert.ok(plain.includes('PASS'));
  assert.ok(plain.includes('52ms'));
});

test('table: renderTable handles empty rows gracefully', () => {
  const columns = [{ header: 'Header1' }];
  const table = renderTable(columns, []);
  assert.ok(stripAnsi(table).includes('Header1'));
});
