import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { runAction } from '../src/action/index.ts';

console.log('--- TEST: End-to-End GitHub Action Integration Suite ---');

async function runTests() {
  const mockOutputFile = path.join(process.cwd(), 'mock_github_output.tmp');
  const mockSummaryFile = path.join(process.cwd(), 'mock_github_summary.tmp');

  process.env.GITHUB_OUTPUT = mockOutputFile;
  process.env.GITHUB_STEP_SUMMARY = mockSummaryFile;

  try {
    // -------------------------------------------------------------
    // Test 1: Full verification on sample fixture (detects 404, fails with Exit Code 1)
    // -------------------------------------------------------------
    console.log('[TEST 1] Full verification on sample app (detects regressions, yields Exit Code 1)');
    const res1 = await runAction({
      'project-path': 'src/fixtures/sample-app',
      'verification-profile': 'full',
      'report-output': 'proofix-reports-int-1',
      'fail-on-regression': 'true',
      'timeout-minutes': '5',
      retries: '1',
      'generate-summary': 'true',
      'upload-artifacts': 'true',
    });

    assert.strictEqual(res1.exitCode, 1, 'Run with failing 404 route must return Exit Code 1');
    assert.ok(res1.summary.includes('PROOFix Verification Summary'));
    assert.ok(res1.summary.includes('Internal Link Integrity'));
    console.log('  -> Integration test 1 verified: Exit Code 1 returned for detected failure.');

    // -------------------------------------------------------------
    // Test 2: Advisory mode verification (fail-on-regression: false, yields Exit Code 0)
    // -------------------------------------------------------------
    console.log('[TEST 2] Advisory mode verification (yields Exit Code 0)');
    const res2 = await runAction({
      'project-path': 'src/fixtures/sample-app',
      'verification-profile': 'full',
      'report-output': 'proofix-reports-int-2',
      'fail-on-regression': 'false',
      'timeout-minutes': '5',
      retries: '1',
      'generate-summary': 'true',
      'upload-artifacts': 'false',
    });

    assert.strictEqual(res2.exitCode, 0, 'Advisory mode must yield Exit Code 0');
    console.log('  -> Integration test 2 verified: Advisory mode allowed Exit Code 0.');

    // -------------------------------------------------------------
    // Test 3: Invalid configuration / Missing directory (yields Exit Code 2)
    // -------------------------------------------------------------
    console.log('[TEST 3] Invalid path configuration (yields Exit Code 2)');
    const res3 = await runAction({
      'project-path': 'non_existent_folder_path_xyz',
      'verification-profile': 'full',
    });

    assert.strictEqual(res3.exitCode, 2, 'Execution error must return Exit Code 2');
    console.log('  -> Integration test 3 verified: Missing workspace yielded Exit Code 2.');

    // -------------------------------------------------------------
    // Test 4: GITHUB_OUTPUT file contents
    // -------------------------------------------------------------
    console.log('[TEST 4] Verify GITHUB_OUTPUT file outputs');
    assert.ok(fs.existsSync(mockOutputFile));
    const outputContent = fs.readFileSync(mockOutputFile, 'utf-8');
    assert.ok(outputContent.includes('status='));
    assert.ok(outputContent.includes('exit-code='));
    assert.ok(outputContent.includes('run-id='));
    console.log('  -> GITHUB_OUTPUT populated with step variables.');

    // Cleanup reports
    for (const r of ['proofix-reports-int-1', 'proofix-reports-int-2']) {
      const p = path.join(process.cwd(), r);
      if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
    }
  } finally {
    if (fs.existsSync(mockOutputFile)) fs.unlinkSync(mockOutputFile);
    if (fs.existsSync(mockSummaryFile)) fs.unlinkSync(mockSummaryFile);
  }

  console.log('\n--- All Contribution 29 Action Integration Tests Passed! ---');
}

runTests().catch((err) => {
  console.error('Test failure:', err);
  process.exit(1);
});
