import assert from 'node:assert/strict';
import {
  buildNamespacedVideoPath,
  createVideoArtifactMetadata,
  attachRecordingToTest,
} from '../src/lib/video/video-metadata.ts';

console.log('--- Testing Video Artifact Metadata & Isolation (Contribution 64) ---');

function createSampleTestResult(runId, testId) {
  return {
    id: testId,
    runId,
    name: 'Sample Test',
    category: 'smoke',
    status: 'failed',
    durationMs: 1200,
    actualResult: 'Element not found',
    evidence: {
      consoleErrors: [],
      networkFailures: [],
      steps: [],
    },
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  };
}

// 1. Metadata completeness
function testMetadataCreation() {
  const meta = createVideoArtifactMetadata({
    runId: 'run_100',
    projectId: 'proj_alpha',
    testResultId: 'res_100_01',
    browserContextId: 'ctx_001',
    storagePath: '/artifacts/runs/run_100/videos/test_res_100_01_ctx_001.webm',
    sizeBytes: 154200,
    durationMs: 5400,
    resolution: { width: 1280, height: 720 },
    status: 'ready',
    testName: 'Smoke Test',
    isFailureRecording: true,
  });

  assert.equal(meta.runId, 'run_100');
  assert.equal(meta.projectId, 'proj_alpha');
  assert.equal(meta.testResultId, 'res_100_01');
  assert.equal(meta.browserContextId, 'ctx_001');
  assert.equal(meta.sizeBytes, 154200);
  assert.equal(meta.durationMs, 5400);
  assert.equal(meta.resolution.width, 1280);
  assert.equal(meta.status, 'ready');
  assert.equal(meta.isFailureRecording, true);
  assert.ok(meta.createdAt);
  console.log('[PASS] Video recording metadata captured with all required run, test, and context properties.');
}

// 2. Parallel run isolation: parallel runs cannot attach a recording to the wrong test
function testParallelRunIsolation() {
  // Simulate two parallel runs: Run A and Run B executing concurrently
  const runA_id = 'run_parallel_A';
  const runB_id = 'run_parallel_B';

  const testA = createSampleTestResult(runA_id, 'test_01');
  const testB = createSampleTestResult(runB_id, 'test_01'); // same test name/order, different run

  const videoA = createVideoArtifactMetadata({
    runId: runA_id,
    projectId: 'proj_demo',
    testResultId: 'test_01',
    browserContextId: 'ctx_A',
    storagePath: '/artifacts/runs/run_parallel_A/videos/test_01.webm',
    sizeBytes: 85000,
    durationMs: 3000,
    resolution: { width: 1280, height: 720 },
    status: 'ready',
  });

  const videoB = createVideoArtifactMetadata({
    runId: runB_id,
    projectId: 'proj_demo',
    testResultId: 'test_01',
    browserContextId: 'ctx_B',
    storagePath: '/artifacts/runs/run_parallel_B/videos/test_01.webm',
    sizeBytes: 92000,
    durationMs: 3200,
    resolution: { width: 1280, height: 720 },
    status: 'ready',
  });

  // Valid attachments to their own respective runs
  const enrichedA = attachRecordingToTest(videoA, testA);
  assert.equal(enrichedA.evidence.videoArtifactId, videoA.id);
  assert.equal(enrichedA.runId, runA_id);

  const enrichedB = attachRecordingToTest(videoB, testB);
  assert.equal(enrichedB.evidence.videoArtifactId, videoB.id);
  assert.equal(enrichedB.runId, runB_id);

  // Attempt cross-attachment: Run A video to Run B test MUST THROW
  assert.throws(() => {
    attachRecordingToTest(videoA, testB);
  }, /Cross-run violation/);

  // Attempt cross-attachment: Run B video to Run A test MUST THROW
  assert.throws(() => {
    attachRecordingToTest(videoB, testA);
  }, /Cross-run violation/);

  console.log('[PASS] Parallel runs strictly prevented from attaching recordings to the wrong test.');
}

// 3. Same-run cross-test protection
function testSameRunCrossTestProtection() {
  const runId = 'run_single';
  const test1 = createSampleTestResult(runId, 'res_01');
  const test2 = createSampleTestResult(runId, 'res_02');

  const videoTest1 = createVideoArtifactMetadata({
    runId,
    projectId: 'proj_demo',
    testResultId: 'res_01',
    browserContextId: 'ctx_1',
    storagePath: '/artifacts/runs/run_single/videos/test_01.webm',
    sizeBytes: 40000,
    durationMs: 2000,
    resolution: { width: 1280, height: 720 },
    status: 'ready',
  });

  assert.throws(() => {
    attachRecordingToTest(videoTest1, test2);
  }, /Cross-test violation/);

  console.log('[PASS] Same-run cross-test attachment attempts strictly blocked.');
}

// 4. Path namespacing
function testPathNamespacing() {
  const paths = buildNamespacedVideoPath('/tmp/artifacts', 'run#123!45', 'test/broken', 'ctx@abc:1');
  assert.ok(!paths.storagePath.includes('#'));
  assert.ok(!paths.storagePath.includes('!'));
  assert.ok(paths.fileName.startsWith('test_test_broken_ctx_ctx_abc_1'));
  console.log('[PASS] Path namespacing sanitizes unsafe characters and prevents collisions.');
}

testMetadataCreation();
testParallelRunIsolation();
testSameRunCrossTestProtection();
testPathNamespacing();

console.log('[ALL PASS] Contribution 64 test suite passed.');
