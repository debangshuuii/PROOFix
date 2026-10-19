import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { runActionVerification } from '../src/action/runner-adapter.ts';

console.log('--- TEST: Action Runner Adapter & Real Verification Engine ---');

async function runTests() {
  const reportDir = path.join(process.cwd(), 'proofix-reports-test-adapter');

  console.log('[TEST 1] Execute Action Runner on sample fixture repository');
  const runResult = await runActionVerification({
    projectPath: 'src/fixtures/sample-app',
    verificationProfile: 'full',
    reportOutput: 'proofix-reports-test-adapter',
    failOnRegression: true,
    timeoutMinutes: 5,
    retries: 1,
    generateSummary: true,
    uploadArtifacts: true,
  });

  assert.ok(runResult.runId.startsWith('run_action_'), 'runId must be generated');
  assert.ok(runResult.durationMs >= 0, 'duration must be recorded');
  assert.ok(runResult.results.length >= 3, 'Must evaluate at least 3 checks on sample app');
  assert.ok(runResult.logs.length > 0, 'Must produce verification execution logs');
  console.log(`  -> Genuine run completed: ${runResult.runId} (${runResult.results.length} checks, ${(runResult.durationMs / 1000).toFixed(2)}s)`);

  console.log('[TEST 2] Verify report file generation');
  assert.ok(fs.existsSync(runResult.reportPaths.json), 'JSON report must exist');
  assert.ok(fs.existsSync(runResult.reportPaths.html), 'HTML report must exist');
  assert.ok(fs.existsSync(runResult.reportPaths.markdown), 'Markdown report must exist');

  const jsonReport = JSON.parse(fs.readFileSync(runResult.reportPaths.json, 'utf-8'));
  assert.strictEqual(jsonReport.runId, runResult.runId);
  assert.strictEqual(jsonReport.results.length, runResult.results.length);
  console.log('  -> Report files written and validated on disk.');

  // Cleanup test report directory
  if (fs.existsSync(reportDir)) {
    fs.rmSync(reportDir, { recursive: true, force: true });
  }

  console.log('\n--- All Contribution 22 Runner Adapter Tests Passed! ---');
}

runTests().catch((err) => {
  console.error('Test failure:', err);
  process.exit(1);
});
