import assert from 'node:assert/strict';
import {
  linkTestFailuresWithVideo,
  enrichTestResultsWithRecordings,
  findFailureRecording,
} from '../src/lib/video/failure-linker.ts';

console.log('--- Testing Connecting Videos to Test Failures (Contribution 67) ---');

const mockTests = [
  {
    id: 'res_01_pass',
    runId: 'run_failure_link_test',
    name: 'Homepage Title Check',
    category: 'smoke',
    status: 'passed',
    durationMs: 400,
    actualResult: 'HTTP 200 OK',
    evidence: {
      screenshotPath: '/artifacts/runs/run_failure_link_test/test_1.png',
      consoleErrors: [],
      networkFailures: [],
      steps: [{ name: 'Goto home', status: 'passed', durationMs: 400 }],
    },
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  },
  {
    id: 'res_02_fail',
    runId: 'run_failure_link_test',
    name: 'Broken Navigation 404',
    category: 'route_discovery',
    status: 'failed',
    durationMs: 2200,
    actualResult: 'HTTP 404 Not Found',
    errorDetails: {
      message: 'Route /broken-route returned status 404',
      url: 'http://localhost:4173/broken-route',
      stepFailed: 'Assert HTTP < 400',
    },
    evidence: {
      screenshotPath: '/artifacts/runs/run_failure_link_test/test_2_broken.png',
      consoleErrors: [{ timestamp: '12:00', type: 'error', text: '404 Not Found' }],
      networkFailures: [{ url: '/broken-route', method: 'GET', status: 404 }],
      steps: [
        { name: 'Click link', status: 'passed', durationMs: 150 },
        { name: 'Assert HTTP < 400', status: 'failed', durationMs: 50, error: 'Expected 200, got 404' },
      ],
    },
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  },
  {
    id: 'res_03_fail',
    runId: 'run_failure_link_test',
    name: 'API 500 Server Error',
    category: 'api_health',
    status: 'failed',
    durationMs: 1500,
    actualResult: 'Internal Server Error 500',
    errorDetails: {
      message: 'Database connection failed',
      stepFailed: 'GET /api/data',
    },
    evidence: {
      screenshotPath: '/artifacts/runs/run_failure_link_test/test_3_api.png',
      consoleErrors: [],
      networkFailures: [],
      steps: [{ name: 'GET /api/data', status: 'failed', durationMs: 1500, error: '500 Internal' }],
    },
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  },
];

const mockVideos = [
  {
    id: 'vid_broken_02',
    runId: 'run_failure_link_test',
    projectId: 'proj_sample',
    testResultId: 'res_02_fail',
    browserContextId: 'ctx_02',
    fileName: 'test_res_02_fail.webm',
    storagePath: '/disk/videos/test_res_02_fail.webm',
    publicUrl: '/artifacts/runs/run_failure_link_test/videos/test_res_02_fail.webm',
    mimeType: 'video/webm',
    sizeBytes: 152000,
    durationMs: 2200,
    resolution: { width: 1280, height: 720 },
    status: 'ready',
    createdAt: new Date().toISOString(),
    isFailureRecording: true,
  },
  {
    id: 'vid_api_03',
    runId: 'run_failure_link_test',
    projectId: 'proj_sample',
    testResultId: 'res_03_fail',
    browserContextId: 'ctx_03',
    fileName: 'test_res_03_fail.webm',
    storagePath: '/disk/videos/test_res_03_fail.webm',
    publicUrl: '/artifacts/runs/run_failure_link_test/videos/test_res_03_fail.webm',
    mimeType: 'video/webm',
    sizeBytes: 110000,
    durationMs: 1500,
    resolution: { width: 1280, height: 720 },
    status: 'ready',
    createdAt: new Date().toISOString(),
    isFailureRecording: true,
  },
];

// 1. Link failures with video
function testFailureLinking() {
  const linked = linkTestFailuresWithVideo(mockTests, mockVideos);

  assert.equal(linked.length, 2, 'Only the 2 failed tests should be in failure link report');

  const failure02 = linked.find((l) => l.testId === 'res_02_fail');
  assert.ok(failure02, 'Failure res_02_fail must be present');
  assert.equal(failure02.errorMessage, 'Route /broken-route returned status 404');
  assert.equal(failure02.failedStep, 'Assert HTTP < 400');
  assert.equal(failure02.screenshotPath, '/artifacts/runs/run_failure_link_test/test_2_broken.png');
  assert.ok(failure02.videoRecording);
  assert.equal(failure02.videoRecording.id, 'vid_broken_02');
  assert.equal(failure02.videoRecording.publicUrl, '/artifacts/runs/run_failure_link_test/videos/test_res_02_fail.webm');
  assert.equal(failure02.hasFullEvidence, true, 'Both screenshot and video evidence linked');

  console.log('[PASS] Failed tests accurately linked with error message, failed step, screenshot, and video.');
}

// 2. Reliable retrieval by test failure ID
function testReliableRetrieval() {
  const linked = linkTestFailuresWithVideo(mockTests, mockVideos);

  // User opens failure 'res_03_fail'
  const matched = findFailureRecording('res_03_fail', linked);
  assert.ok(matched);
  assert.equal(matched.testId, 'res_03_fail');
  assert.equal(matched.videoRecording?.id, 'vid_api_03');

  // Attempt to open passed test 'res_01_pass' as a failure returns undefined
  const notAFailure = findFailureRecording('res_01_pass', linked);
  assert.equal(notAFailure, undefined);

  console.log('[PASS] User can open a failure and find its matching recording reliably.');
}

// 3. TestResult evidence enrichment
function testEvidenceEnrichment() {
  const enriched = enrichTestResultsWithRecordings(mockTests, mockVideos);

  const passedTest = enriched.find((t) => t.id === 'res_01_pass');
  assert.equal(passedTest?.evidence.videoPath, undefined);

  const failedTest = enriched.find((t) => t.id === 'res_02_fail');
  assert.equal(failedTest?.evidence.videoPath, '/artifacts/runs/run_failure_link_test/videos/test_res_02_fail.webm');
  assert.equal(failedTest?.evidence.videoArtifactId, 'vid_broken_02');
  assert.equal(failedTest?.evidence.videoStatus, 'ready');

  console.log('[PASS] TestResult objects enriched with video evidence for direct UI consumption.');
}

testFailureLinking();
testReliableRetrieval();
testEvidenceEnrichment();

console.log('[ALL PASS] Contribution 67 test suite passed.');
