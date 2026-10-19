import assert from 'node:assert/strict';
import {
  evaluateRecordingPolicy,
  generateVideoRecordingReport,
} from '../src/lib/video/recording-policy.ts';

console.log('--- Testing Recording Prioritization & Failure Policy (Contribution 65) ---');

function testPolicyDecisions() {
  // Mode 'off'
  const off = evaluateRecordingPolicy('off', 'failed');
  assert.equal(off.shouldRecord, false);
  assert.equal(off.shouldRetain, false);
  assert.equal(off.action, 'skip');

  // Mode 'all'
  const allPass = evaluateRecordingPolicy('all', 'passed');
  assert.equal(allPass.shouldRetain, true);
  assert.equal(allPass.action, 'record_and_keep');

  const allFail = evaluateRecordingPolicy('all', 'failed');
  assert.equal(allFail.shouldRetain, true);
  assert.equal(allFail.action, 'record_and_keep');

  // Mode 'only-on-failure'
  const failOnlyOnPassed = evaluateRecordingPolicy('only-on-failure', 'passed');
  assert.equal(failOnlyOnPassed.shouldRecord, true);
  assert.equal(failOnlyOnPassed.shouldRetain, false);
  assert.equal(failOnlyOnPassed.action, 'record_and_discard');

  const failOnlyOnFailed = evaluateRecordingPolicy('only-on-failure', 'failed');
  assert.equal(failOnlyOnFailed.shouldRecord, true);
  assert.equal(failOnlyOnFailed.shouldRetain, true);
  assert.equal(failOnlyOnFailed.action, 'record_and_keep');

  // Mode 'retain-on-failure' with retries
  const retryScenario = evaluateRecordingPolicy('retain-on-failure', 'passed', { isRetry: true });
  assert.equal(retryScenario.shouldRetain, true, 'Retry scenario must be retained under retain-on-failure');
  assert.equal(retryScenario.action, 'record_and_keep');

  const cleanPass = evaluateRecordingPolicy('retain-on-failure', 'passed', { isRetry: false });
  assert.equal(cleanPass.shouldRetain, false);
  assert.equal(cleanPass.action, 'record_and_discard');

  console.log('[PASS] Recording policy rules strictly prioritize failures and retry scenarios.');
}

function testReportIdentifiesRecordings() {
  const sampleTests = [
    { id: 't_01', runId: 'run_1', name: 'Homepage Health', status: 'passed' },
    { id: 't_02', runId: 'run_1', name: 'Navigation /about', status: 'passed' },
    { id: 't_03', runId: 'run_1', name: 'Broken Route 404', status: 'failed' },
    { id: 't_04', runId: 'run_1', name: 'API Server Error', status: 'failed' },
  ];

  // In 'only-on-failure', only t_03 and t_04 videos are retained
  const recordedVideos = [
    {
      id: 'vid_03',
      runId: 'run_1',
      testResultId: 't_03',
      browserContextId: 'ctx_3',
      fileName: 't_03.webm',
      storagePath: '/disk/t_03.webm',
      publicUrl: '/artifacts/runs/run_1/videos/t_03.webm',
      sizeBytes: 120000,
      durationMs: 4000,
      resolution: { width: 1280, height: 720 },
      status: 'ready',
      isFailureRecording: true,
    },
    {
      id: 'vid_04',
      runId: 'run_1',
      testResultId: 't_04',
      browserContextId: 'ctx_4',
      fileName: 't_04.webm',
      storagePath: '/disk/t_04.webm',
      publicUrl: '/artifacts/runs/run_1/videos/t_04.webm',
      sizeBytes: 95000,
      durationMs: 3100,
      resolution: { width: 1280, height: 720 },
      status: 'ready',
      isFailureRecording: true,
    },
  ];

  const report = generateVideoRecordingReport(sampleTests, recordedVideos, 'only-on-failure');

  assert.equal(report.policyApplied, 'only-on-failure');
  assert.equal(report.totalTests, 4);
  assert.equal(report.recordedCount, 2);
  assert.equal(report.discardedCount, 2);
  assert.equal(report.totalSizeBytes, 215000);

  // Check individual test identification
  assert.equal(report.testRecordings[0].testId, 't_01');
  assert.equal(report.testRecordings[0].recorded, false);

  assert.equal(report.testRecordings[2].testId, 't_03');
  assert.equal(report.testRecordings[2].recorded, true);
  assert.equal(report.testRecordings[2].videoArtifactId, 'vid_03');
  assert.equal(report.testRecordings[2].publicUrl, '/artifacts/runs/run_1/videos/t_03.webm');

  console.log('[PASS] Verification report accurately identifies which tests were recorded and retained.');
}

testPolicyDecisions();
testReportIdentifiesRecordings();

console.log('[ALL PASS] Contribution 65 test suite passed.');
