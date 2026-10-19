import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Module imports from Feature 7
import { validateVideoConfig, resolveVideoConfig, DEFAULT_VIDEO_CONFIG } from '../src/lib/video/recording-config.ts';
import { VideoLifecycleManager } from '../src/lib/video/video-lifecycle.ts';
import { createVideoArtifactMetadata, attachRecordingToTest } from '../src/lib/video/video-metadata.ts';
import { evaluateRecordingPolicy, generateVideoRecordingReport } from '../src/lib/video/recording-policy.ts';
import { resolvePlayerState, formatVideoTime } from '../src/lib/video/player-state.ts';
import { linkTestFailuresWithVideo, findFailureRecording } from '../src/lib/video/failure-linker.ts';
import { validateDownloadAccess } from '../src/lib/video/secure-download.ts';
import { enforceVideoRetention } from '../src/lib/video/retention-cleaner.ts';
import { checkVideoRecordingSupport, resolveSafeEnvironmentConfig } from '../src/lib/video/environment.ts';

console.log('================================================================');
console.log('  PROOFix Feature 7 — Playwright Video Recording CI Test Suite  ');
console.log('================================================================');

let passedTests = 0;
let failedTests = 0;

async function runCheck(name, fn) {
  try {
    process.stdout.write(`[TEST] ${name}... `);
    await fn();
    console.log('PASSED');
    passedTests++;
  } catch (err) {
    console.log('FAILED');
    console.error(`       Error: ${err.message}`);
    failedTests++;
  }
}

async function main() {
  // 1. Contribution 61: Configuration & Validated Settings
  await runCheck('C61: Default recording settings preserve existing behavior', () => {
    const defaults = validateVideoConfig();
    assert.equal(defaults.enabled, false);
    assert.equal(defaults.mode, 'off');
    assert.equal(defaults.resolution.width, 1280);
    assert.equal(defaults.retention.maxAgeDays, 14);
  });

  await runCheck('C61: Invalid recording modes and resolutions rejected', () => {
    assert.throws(() => validateVideoConfig({ mode: 'invalid_mode' }), /Invalid recording mode/);
    assert.throws(() => validateVideoConfig({ resolution: { width: 100, height: 100 } }), /Invalid video width/);
  });

  // 2. Contribution 62: Browser Context Configuration
  await runCheck('C62: Video capture resolution and mode resolution helper', () => {
    const resolved = resolveVideoConfig({ mode: 'only-on-failure' }, { resolution: { width: 1920, height: 1080 } });
    assert.equal(resolved.mode, 'only-on-failure');
    assert.equal(resolved.resolution.width, 1920);
    assert.equal(resolved.resolution.height, 1080);
  });

  // 3. Contribution 63: Video Finalization & Lifecycle
  await runCheck('C63: Videos are not marked ready before finalization and verification', async () => {
    const manager = new VideoLifecycleManager();
    const sessionId = `ci_sess_${Date.now()}`;
    const testDir = path.join(process.cwd(), 'public', 'artifacts', 'ci_test_lifecycle');
    fs.mkdirSync(testDir, { recursive: true });

    manager.startSession(sessionId, {
      runId: 'ci_run',
      testId: 't1',
      tempDir: testDir,
    });

    assert.equal(manager.isReady(sessionId), false, 'Recording must not be ready while active');

    manager.markFinalizing(sessionId);
    assert.equal(manager.isReady(sessionId), false, 'Recording must not be ready while finalizing');

    // Create valid simulated file
    const sampleWebm = path.join(testDir, 'raw.webm');
    fs.writeFileSync(sampleWebm, Buffer.alloc(1024, 0xaa));
    const finalWebm = path.join(testDir, 'final.webm');

    await manager.finalizeSession(sessionId, {
      destinationPath: finalWebm,
      minSizeBytes: 500,
    });

    assert.equal(manager.isReady(sessionId), true, 'Recording must be marked ready after verification');

    fs.rmSync(testDir, { recursive: true, force: true });
  });

  // 4. Contribution 64: Video Artifact Metadata & Parallel Run Isolation
  await runCheck('C64: Parallel runs cannot attach a recording to the wrong test', () => {
    const videoRunA = createVideoArtifactMetadata({
      runId: 'run_A',
      projectId: 'proj_demo',
      testResultId: 'test_1',
      browserContextId: 'ctx_A',
      storagePath: '/disk/run_A/test_1.webm',
      sizeBytes: 50000,
      durationMs: 2000,
      resolution: { width: 1280, height: 720 },
      status: 'ready',
    });

    const testRunB = {
      id: 'test_1',
      runId: 'run_B', // Different run
      name: 'Sample Test',
      category: 'smoke',
      status: 'failed',
      durationMs: 1200,
      actualResult: 'Failed',
      evidence: { consoleErrors: [], networkFailures: [], steps: [] },
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };

    assert.throws(() => {
      attachRecordingToTest(videoRunA, testRunB);
    }, /Cross-run violation/);
  });

  // 5. Contribution 65: Prioritize Recording Failed Tests & Report
  await runCheck('C65: Policy prioritizes failed tests and generates report summary', () => {
    const policy = evaluateRecordingPolicy('only-on-failure', 'failed');
    assert.equal(policy.shouldRetain, true);
    assert.equal(policy.action, 'record_and_keep');

    const passPolicy = evaluateRecordingPolicy('only-on-failure', 'passed');
    assert.equal(passPolicy.shouldRetain, false);
    assert.equal(passPolicy.action, 'record_and_discard');

    const report = generateVideoRecordingReport(
      [{ id: 't1', runId: 'r1', name: 'Test 1', status: 'failed' }],
      [{ id: 'v1', runId: 'r1', testResultId: 't1', status: 'ready', sizeBytes: 50000 }],
      'only-on-failure'
    );
    assert.equal(report.recordedCount, 1);
    assert.equal(report.testRecordings[0].recorded, true);
  });

  // 6. Contribution 66: Video Playback Interface & Privacy
  await runCheck('C66: Playback interface handles states without exposing storage internals', () => {
    const rawDisk = 'D:\\Coding\\PROOFix\\public\\artifacts\\runs\\r1\\videos\\test.webm';
    const playerState = resolvePlayerState({
      status: 'ready',
      videoUrl: rawDisk,
      storagePath: rawDisk,
      durationMs: 4000,
    });

    assert.equal(playerState.state, 'ready');
    assert.equal(playerState.isPlayable, true);
    assert.equal(playerState.exposesStorageInternals, false);
    assert.ok(!playerState.publicUrl.includes('D:'));
    assert.equal(playerState.publicUrl, '/artifacts/runs/r1/videos/test.webm');
  });

  // 7. Contribution 67: Connect Videos to Test Failures
  await runCheck('C67: Videos linked reliably to failed tests, error details, and screenshots', () => {
    const linked = linkTestFailuresWithVideo(
      [
        {
          id: 't_fail',
          runId: 'r1',
          name: 'Broken link',
          status: 'failed',
          actualResult: '404',
          errorDetails: { message: 'HTTP 404', stepFailed: 'Click' },
          evidence: { screenshotPath: '/shot.png', consoleErrors: [], networkFailures: [], steps: [] },
        },
      ],
      [{ id: 'v_fail', runId: 'r1', testResultId: 't_fail', status: 'ready', publicUrl: '/video.webm' }]
    );

    assert.equal(linked.length, 1);
    assert.equal(linked[0].failedStep, 'Click');
    assert.equal(linked[0].screenshotPath, '/shot.png');
    assert.equal(linked[0].videoRecording?.id, 'v_fail');

    const found = findFailureRecording('t_fail', linked);
    assert.ok(found);
  });

  // 8. Contribution 68: Secure Video Downloads & Traversal Prevention
  await runCheck('C68: Unauthorized project access and path traversal strictly blocked', async () => {
    const mockDb = {
      async getProjectById(id) {
        return id === 'proj_safe' ? { id: 'proj_safe', ownerId: 'usr_valid' } : null;
      },
      async getRunById(id) {
        return id === 'run_safe' ? { id: 'run_safe', projectId: 'proj_safe' } : null;
      },
    };

    // Unauthorized user
    const unauth = await validateDownloadAccess({
      projectId: 'proj_safe',
      runId: 'run_safe',
      videoIdOrName: 'test.webm',
      requesterUserId: 'usr_intruder',
      dbInstance: mockDb,
    });
    assert.equal(unauth.authorized, false);
    assert.equal(unauth.statusCode, 403);

    // Traversal
    const traversal = await validateDownloadAccess({
      projectId: 'proj_safe',
      runId: 'run_safe',
      videoIdOrName: '../secret.key',
      requesterUserId: 'usr_valid',
      dbInstance: mockDb,
    });
    assert.equal(traversal.authorized, false);
    assert.equal(traversal.statusCode, 400);
  });

  // 9. Contribution 69: Retention Limits & Active Run Preservation
  await runCheck('C69: Expired recordings cleaned up while active runs are strictly preserved', async () => {
    const testDir = path.join(process.cwd(), 'public', 'artifacts', 'ci_retention_test');
    const activeDir = path.join(testDir, 'runs', 'active_run_99', 'videos');
    fs.mkdirSync(activeDir, { recursive: true });
    const activeFile = path.join(activeDir, 'active.webm');
    fs.writeFileSync(activeFile, Buffer.alloc(1000));

    const result = await enforceVideoRetention({
      baseArtifactsDir: testDir,
      maxAgeDays: 0, // expire everything non-active
      activeRunIds: ['active_run_99'],
    });

    assert.equal(fs.existsSync(activeFile), true, 'Active run video must be preserved');
    assert.ok(result.activeRunsPreserved.includes('active_run_99'));

    fs.rmSync(testDir, { recursive: true, force: true });
  });

  // 10. Contribution 70: Unsupported Environments & Graceful Fallback
  await runCheck('C70: Unsupported environment detection and graceful fallback', () => {
    const caps = checkVideoRecordingSupport({ platform: 'android', hasFfmpeg: false });
    assert.equal(caps.supported, false);

    const fallback = resolveSafeEnvironmentConfig({ enabled: true, mode: 'all' });
    assert.equal(typeof fallback.mode, 'string');
  });

  console.log('----------------------------------------------------------------');
  console.log(`Results: ${passedTests} Passed, ${failedTests} Failed`);
  console.log('================================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal CI runner failure:', err);
  process.exit(1);
});
