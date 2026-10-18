import { extractUnifiedDiff, generatePatchProposal } from '../src/lib/ai/patch-generator.ts';
import assert from 'assert';

console.log('--- TEST: Unified-Diff Patch Generator & Guardrails ---');

// Test 1: extractUnifiedDiff parses markdown fenced diff
const rawMarkdown = `Here is the explanation for the fix:
\`\`\`diff
--- a/src/app/page.tsx
+++ b/src/app/page.tsx
@@ -10,1 +10,1 @@
-<Link href="/broken-route">Broken</Link>
+<Link href="/about">About</Link>
\`\`\`
This concludes the patch.`;

const extracted = extractUnifiedDiff(rawMarkdown);
assert.ok(extracted, 'Should extract valid diff');
assert.ok(extracted.startsWith('--- a/src/app/page.tsx'));
assert.ok(extracted.includes('@@ -10,1 +10,1 @@'));
console.log('[PASS] Unified diff successfully extracted from markdown response.');

// Test 2: generatePatchProposal returns valid proposal for sample context
const mockContext = {
  failureId: 'fail_res_03',
  testName: 'Broken Navigation Link to Missing Route (/broken-route)',
  category: 'user_flow',
  errorMessage: 'HTTP 404 Not Found at /broken-route',
  commitSha: 'a1b2c3d4e5f6',
  consoleErrors: [],
  networkFailures: [],
  relatedSnippets: [
    {
      filePath: 'src/fixtures/sample-app/src/app/page.tsx',
      startLine: 1,
      endLine: 20,
      content: '<Link href="/broken-route">',
    },
  ],
  collectedAt: new Date().toISOString(),
};

async function testGeneration() {
  const result = await generatePatchProposal({ context: mockContext });
  assert.strictEqual(result.success, true, 'Patch generation should succeed');
  assert.ok(result.proposal, 'Proposal object must be returned');
  assert.strictEqual(result.proposal.failureId, 'fail_res_03');
  assert.ok(result.proposal.proposedChanges.includes('--- a/'));
  assert.ok(result.proposal.confidenceScore >= 90);
  console.log('[PASS] Valid proposal generated with high confidence.');

  // Test 3: Rejection of malformed diff
  const invalidExtract = extractUnifiedDiff('This is just plain text without headers');
  assert.strictEqual(invalidExtract, null, 'Malformed text without unified diff headers should return null');
  console.log('[PASS] Malformed non-diff response rejected safely.');

  console.log('All patch-generator tests passed successfully!\n');
}

testGeneration().catch((err) => {
  console.error('Test Failed:', err);
  process.exit(1);
});
