import assert from 'assert';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';

import { validateActionInputs, validateActionYml } from '../src/action/validator.ts';
import { runActionVerification } from '../src/action/runner-adapter.ts';
import { resolveWorkflowConfig, getCategoriesForProfile } from '../src/action/config-resolver.ts';
import { determineActionExitCode, describeExitCode, EXIT_SUCCESS, EXIT_VERIFICATION_FAILURE, EXIT_EXECUTION_ERROR } from '../src/action/exit-codes.ts';
import { generateJobSummaryMarkdown } from '../src/action/job-summary.ts';
import { packageVerificationArtifacts } from '../src/action/artifact-packager.ts';
import { sanitizeActionLog, MINIMUM_PERMISSIONS } from '../src/action/security.ts';
import { isTransientError, retryOperation, withTimeout } from '../src/action/retry-handler.ts';
import { runAction } from '../src/action/index.ts';

console.log('===============================================================');
console.log('   PROOFIX CI: FEATURE 3 REUSABLE GITHUB ACTION SUITE          ');
console.log('   Covering Contributions 21 through 30 in CI Pipeline         ');
console.log('===============================================================\n');

async function runActionCI() {
  const actionYmlPath = path.join(process.cwd(), 'action.yml');

  // -------------------------------------------------------------------------
  // [21] Action Interface & action.yml
  // -------------------------------------------------------------------------
  console.log('[CI - 21] Verify Action Interface & action.yml Schema');
  const ymlVal = validateActionYml(actionYmlPath);
  assert.strictEqual(ymlVal.valid, true);

  const inputsVal = validateActionInputs({
    'project-path': '.',
    'verification-profile': 'full',
    'timeout-minutes': '15',
    retries: '2',
  });
  assert.strictEqual(inputsVal.valid, true);
  console.log('  [PASS] Contribution 21: action.yml definition and input schema validated.');

  // -------------------------------------------------------------------------
  // [22] Action Runner Adapter
  // -------------------------------------------------------------------------
  console.log('\n[CI - 22] Verify Action Runner Adapter on Sample Fixture');
  const runResult = await runActionVerification({
    projectPath: 'src/fixtures/sample-app',
    verificationProfile: 'full',
    reportOutput: 'proofix-reports-ci',
    failOnRegression: true,
    timeoutMinutes: 5,
    retries: 1,
    generateSummary: true,
    uploadArtifacts: true,
  });
  assert.ok(runResult.runId.startsWith('run_action_'));
  assert.ok(runResult.results.length >= 3);
  console.log(`  [PASS] Contribution 22: Real verification executed on fixture (${runResult.results.length} checks).`);

  // -------------------------------------------------------------------------
  // [23] Workflow Configuration & Profile Behavioral Adaptation
  // -------------------------------------------------------------------------
  console.log('\n[CI - 23] Verify Workflow Configuration & Behavioral Adaptation');
  const smokeCats = getCategoriesForProfile('smoke');
  const fullCats = getCategoriesForProfile('full');
  assert.strictEqual(smokeCats.length, 1);
  assert.ok(fullCats.length > smokeCats.length);

  const resolved = resolveWorkflowConfig({
    projectPath: 'src/fixtures/sample-app',
    verificationProfile: 'smoke',
    reportOutput: 'proofix-reports-ci',
    failOnRegression: true,
    timeoutMinutes: 10,
    retries: 2,
    generateSummary: true,
    uploadArtifacts: true,
  });
  assert.strictEqual(resolved.profile, 'smoke');
  assert.strictEqual(resolved.timeoutMs, 600000);
  console.log('  [PASS] Contribution 23: Workflow configuration adapts behavior by profile.');

  // -------------------------------------------------------------------------
  // [24] Exit Codes & Failure Invariant
  // -------------------------------------------------------------------------
  console.log('\n[CI - 24] Verify Exit Code Determination & Failure Invariant');
  assert.strictEqual(determineActionExitCode({ status: 'passed', failedChecks: 0, failOnRegression: true }), 0);
  assert.strictEqual(determineActionExitCode({ status: 'failed', failedChecks: 1, failOnRegression: true }), 1);
  assert.strictEqual(determineActionExitCode({ status: 'error', failedChecks: 0, failOnRegression: true, hasExecutionError: true }), 2);

  // Invariant check: Failed checks can never return 0 when failOnRegression is true
  for (let f = 1; f <= 10; f++) {
    assert.strictEqual(determineActionExitCode({ status: 'failed', failedChecks: f, failOnRegression: true }), 1);
  }
  console.log('  [PASS] Contribution 24: Exit codes strictly adhere to failure invariants.');

  // -------------------------------------------------------------------------
  // [25] GitHub Job Summary Markdown
  // -------------------------------------------------------------------------
  console.log('\n[CI - 25] Verify GitHub Job Summary Markdown');
  const summaryMd = generateJobSummaryMarkdown({
    runId: runResult.runId,
    status: runResult.status,
    durationMs: runResult.durationMs,
    summary: runResult.summary,
    results: runResult.results,
    reportPaths: { json: 'proofix-report.json', html: 'proofix-report.html' },
  });
  assert.ok(summaryMd.includes('PROOFix Verification Summary'));
  assert.ok(summaryMd.includes(runResult.runId));
  console.log('  [PASS] Contribution 25: Step summary markdown generated with tables.');

  // -------------------------------------------------------------------------
  // [26] Artifact Packaging
  // -------------------------------------------------------------------------
  console.log('\n[CI - 26] Verify Artifact Packaging (Pass & Fail Invariant)');
  const pkgRes = await packageVerificationArtifacts({
    runId: runResult.runId,
    reportDir: path.join(process.cwd(), 'proofix-reports-ci'),
    results: runResult.results,
    logs: runResult.logs,
  });
  assert.ok(fs.existsSync(pkgRes.zipPath));
  assert.strictEqual(pkgRes.availableOnFailure, true);
  const zipReader = new AdmZip(pkgRes.zipPath);
  assert.ok(zipReader.getEntries().length > 0);
  console.log(`  [PASS] Contribution 26: Packaged ${pkgRes.fileCount} artifact(s) into zip archive.`);

  // -------------------------------------------------------------------------
  // [27] Secret Redaction & Permissions Hardening
  // -------------------------------------------------------------------------
  console.log('\n[CI - 27] Verify Secret Redaction & Least-Privilege Permissions');
  const rawLog = 'GitHub token: ghp_1234567890abcdefghijklmnopqrstuvwxyz12, OpenAI key: sk-1234567890abcdef1234567890abcdef';
  const cleanLog = sanitizeActionLog(rawLog);
  assert.ok(!cleanLog.includes('ghp_'));
  assert.ok(!cleanLog.includes('sk-'));
  assert.strictEqual(MINIMUM_PERMISSIONS.readOnly.contents, 'read');
  console.log('  [PASS] Contribution 27: Secrets successfully redacted from log streams.');

  // -------------------------------------------------------------------------
  // [28] Timeouts & Bounded Retries
  // -------------------------------------------------------------------------
  console.log('\n[CI - 28] Verify Timeouts & Bounded Retries');
  assert.strictEqual(isTransientError({ code: 'ECONNREFUSED' }), true);
  assert.strictEqual(isTransientError({ status: 401 }), false);

  let retryAttempts = 0;
  const recovered = await retryOperation(async (attempt) => {
    retryAttempts = attempt;
    if (attempt === 1) {
      const e = new Error('transient');
      e.code = 'ECONNRESET';
      throw e;
    }
    return 'ok';
  }, { maxRetries: 2, initialDelayMs: 10 });
  assert.strictEqual(recovered, 'ok');
  assert.strictEqual(retryAttempts, 2);
  console.log('  [PASS] Contribution 28: Bounded retries recovered transient errors.');

  // -------------------------------------------------------------------------
  // [29] Action Integration Execution
  // -------------------------------------------------------------------------
  console.log('\n[CI - 29] Verify Action Integration Execution');
  const actionRes = await runAction({
    'project-path': 'src/fixtures/sample-app',
    'verification-profile': 'smoke',
    'report-output': 'proofix-reports-ci',
    'fail-on-regression': 'false',
    'upload-artifacts': 'false',
  });
  assert.strictEqual(actionRes.exitCode, 0);
  console.log('  [PASS] Contribution 29: End-to-end action execution succeeded.');

  // -------------------------------------------------------------------------
  // [30] Release Packaging, Workflows & Documentation
  // -------------------------------------------------------------------------
  console.log('\n[CI - 30] Verify Release Packaging, Workflows & Documentation');
  assert.ok(fs.existsSync(path.join(process.cwd(), 'action.yml')), 'action.yml must exist');
  assert.ok(fs.existsSync(path.join(process.cwd(), 'bin', 'action.js')), 'bin/action.js must exist');
  assert.ok(fs.existsSync(path.join(process.cwd(), '.github', 'workflows', 'proofix-verification.yml')), 'Workflow must exist');
  assert.ok(fs.existsSync(path.join(process.cwd(), 'docs', 'github-action.md')), 'Documentation must exist');
  console.log('  [PASS] Contribution 30: Workflows, action runner binary, and docs verified.');

  // Cleanup
  const ciReportDir = path.join(process.cwd(), 'proofix-reports-ci');
  if (fs.existsSync(ciReportDir)) {
    fs.rmSync(ciReportDir, { recursive: true, force: true });
  }

  console.log('\n===============================================================');
  console.log('  ALL 10 GITHUB ACTION CONTRIBUTIONS (21-30) PASSED IN CI!     ');
  console.log('===============================================================');
}

runActionCI().catch((err) => {
  console.error('\n[CI FAILURE] Action CI suite failed:', err);
  process.exit(1);
});
