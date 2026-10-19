import assert from 'assert';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { packageVerificationArtifacts } from '../src/action/artifact-packager.ts';

console.log('--- TEST: Artifact Packaging & Post-Run Inspection ---');

async function runTests() {
  const testReportDir = path.join(process.cwd(), 'proofix-reports-pkg-test');
  if (!fs.existsSync(testReportDir)) fs.mkdirSync(testReportDir, { recursive: true });

  // Create mock report files
  fs.writeFileSync(path.join(testReportDir, 'proofix-report.json'), JSON.stringify({ run: 'test' }), 'utf-8');
  fs.writeFileSync(path.join(testReportDir, 'proofix-report.html'), '<html>Report</html>', 'utf-8');

  // Test 1: Package artifacts after successful run
  console.log('[TEST 1] Package artifacts for successful run');
  const resPass = await packageVerificationArtifacts({
    runId: 'run_pkg_pass_123',
    reportDir: testReportDir,
    logs: ['[PROOFix] Initializing run...', '[PROOFix] Checks passed 4/4.'],
  });

  assert.ok(fs.existsSync(resPass.zipPath), 'Zip file must exist');
  assert.ok(resPass.totalSizeBytes > 0, 'Zip must have non-zero size');
  assert.strictEqual(resPass.availableOnFailure, true);
  assert.ok(resPass.includedFiles.includes('proofix-report.json'));
  assert.ok(resPass.includedFiles.includes('proofix-execution.log'));
  console.log(`  -> Passed run packaged ${resPass.fileCount} files into: ${path.basename(resPass.zipPath)}`);

  // Test 2: Package artifacts after failed run
  console.log('[TEST 2] Package artifacts for failed run (availability invariant)');
  const resFail = await packageVerificationArtifacts({
    runId: 'run_pkg_fail_456',
    reportDir: testReportDir,
    logs: ['[PROOFix] Execution started', '[ERROR] Check failed: HTTP 404'],
    results: [
      {
        id: 'r_fail_1',
        runId: 'run_pkg_fail_456',
        name: 'Dead link check',
        category: 'smoke',
        status: 'failed',
        durationMs: 120,
        actualResult: '404',
        evidence: { consoleErrors: [], networkFailures: [], steps: [] },
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      },
    ],
  });

  assert.ok(fs.existsSync(resFail.zipPath), 'Zip file must exist even when checks fail');
  assert.strictEqual(resFail.availableOnFailure, true, 'Artifacts must be available on failure');
  console.log('  -> Failed run artifacts confirmed available with failure evidence.');

  // Test 3: Inspect archive contents using AdmZip reader
  console.log('[TEST 3] Inspect and extract zip contents');
  const reader = new AdmZip(resPass.zipPath);
  const entries = reader.getEntries().map((e) => e.entryName);
  assert.ok(entries.includes('proofix-report.json'));
  assert.ok(entries.includes('proofix-execution.log'));
  assert.ok(entries.includes('artifacts-manifest.json'));

  const manifestEntry = reader.readAsText('artifacts-manifest.json');
  const manifest = JSON.parse(manifestEntry);
  assert.strictEqual(manifest.runId, 'run_pkg_pass_123');
  assert.strictEqual(manifest.availableOnFailure, true);
  console.log(`  -> Validated zip entries (${entries.length}) and manifest metadata.`);

  // Cleanup
  if (fs.existsSync(testReportDir)) {
    fs.rmSync(testReportDir, { recursive: true, force: true });
  }

  console.log('\n--- All Contribution 26 Artifact Packaging Tests Passed! ---');
}

runTests().catch((err) => {
  console.error('Test failure:', err);
  process.exit(1);
});
