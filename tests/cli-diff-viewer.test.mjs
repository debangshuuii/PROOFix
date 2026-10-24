import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDiffStats, renderTerminalDiff } from '../src/lib/cli/diff-viewer.ts';
import { stripAnsi } from '../src/lib/cli/colors.ts';

const SAMPLE_DIFF = `--- a/src/app/checkout/page.tsx
+++ b/src/app/checkout/page.tsx
@@ -10,4 +10,5 @@
 const total = 100;
-const endpoint = '/api/checkout';
+const endpoint = '/api/v1/checkout';
+const isValidated = true;
 return <form action={endpoint} />`;

test('diff-viewer: parseDiffStats counts additions and deletions accurately', () => {
  const stats = parseDiffStats(SAMPLE_DIFF);
  assert.equal(stats.additions, 2);
  assert.equal(stats.deletions, 1);
  assert.equal(stats.filesChanged, 1);
});

test('diff-viewer: renderTerminalDiff formats diff with line numbers and summary', () => {
  const rendered = renderTerminalDiff(SAMPLE_DIFF, { showLineNumbers: true });
  const plain = stripAnsi(rendered);

  assert.ok(plain.includes('--- a/src/app/checkout/page.tsx'));
  assert.ok(plain.includes('+++ b/src/app/checkout/page.tsx'));
  assert.ok(plain.includes('+const endpoint = \'/api/v1/checkout\';'));
  assert.ok(plain.includes('-const endpoint = \'/api/checkout\';'));
  assert.ok(plain.includes('Diff Summary: +2 -1 across 1 file(s)'));
});

test('diff-viewer: honors maxLines truncation', () => {
  const rendered = renderTerminalDiff(SAMPLE_DIFF, { maxLines: 3 });
  const plain = stripAnsi(rendered);
  assert.ok(plain.includes('truncated'));
});
