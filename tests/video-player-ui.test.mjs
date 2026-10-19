import assert from 'node:assert/strict';
import {
  resolvePlayerState,
  sanitizePlaybackUrl,
  formatVideoTime,
} from '../src/lib/video/player-state.ts';

console.log('--- Testing Video Playback Interface State & Privacy (Contribution 66) ---');

// 1. Loading State (active recording / finalizing)
function testLoadingState() {
  const recordingModel = resolvePlayerState({
    status: 'recording',
    title: 'Active Session Recording',
  });
  assert.equal(recordingModel.state, 'loading');
  assert.equal(recordingModel.isPlayable, false);
  assert.ok(recordingModel.userMessage?.includes('in progress'));

  const finalizingModel = resolvePlayerState({
    status: 'finalizing',
    title: 'Closing Browser Context',
  });
  assert.equal(finalizingModel.state, 'loading');
  assert.equal(finalizingModel.isPlayable, false);
  console.log('[PASS] Loading state cleanly reflects recording and finalizing status.');
}

// 2. Unavailable State (discarded / expired / missing)
function testUnavailableState() {
  const discardedModel = resolvePlayerState({
    status: 'discarded',
    title: 'Passed Test',
  });
  assert.equal(discardedModel.state, 'unavailable');
  assert.equal(discardedModel.isPlayable, false);
  assert.ok(discardedModel.userMessage?.includes('discarded per policy'));

  const expiredModel = resolvePlayerState({
    status: 'cleaned_up',
  });
  assert.equal(expiredModel.state, 'unavailable');
  assert.ok(expiredModel.userMessage?.includes('purged under retention'));
  console.log('[PASS] Unavailable states provide clear reasons for discarded or expired recordings.');
}

// 3. Playback Error State
function testPlaybackErrorState() {
  const errorModel = resolvePlayerState({
    status: 'failed',
    playbackError: 'Browser cannot decode WebM media stream (ERR_DECODE_FAILURE)',
  });
  assert.equal(errorModel.state, 'playback_error');
  assert.equal(errorModel.isPlayable, false);
  assert.ok(errorModel.userMessage?.includes('cannot decode WebM'));
  console.log('[PASS] Playback error state captures decoding and stream issues.');
}

// 4. Ready State and Storage Internals Protection
function testReadyStateAndPrivacy() {
  const secretDiskPath = 'D:\\Coding\\PROOFix\\public\\artifacts\\runs\\run_10\\videos\\test_01.webm';
  const readyModel = resolvePlayerState({
    status: 'ready',
    videoUrl: secretDiskPath, // Passed raw internal path
    storagePath: secretDiskPath,
    durationMs: 4500,
    resolution: { width: 1280, height: 720 },
  });

  assert.equal(readyModel.state, 'ready');
  assert.equal(readyModel.isPlayable, true);
  assert.equal(readyModel.formattedDuration, '0:04');
  assert.equal(readyModel.resolutionLabel, '1280x720');

  // CRITICAL REQUIREMENT: "without exposing storage internals"
  assert.equal(
    readyModel.exposesStorageInternals,
    false,
    'CRITICAL: Player must never expose raw OS disk paths to client!'
  );
  assert.ok(
    !readyModel.publicUrl?.includes('D:'),
    'Public URL must be sanitized of drive letters'
  );
  assert.equal(
    readyModel.publicUrl,
    '/artifacts/runs/run_10/videos/test_01.webm',
    'Must map to safe public artifacts route'
  );

  console.log('[PASS] Ready video recording verified and storage internals protected from exposure.');
}

// 5. Time formatter
function testTimeFormatter() {
  assert.equal(formatVideoTime(0), '0:00');
  assert.equal(formatVideoTime(65), '1:05');
  assert.equal(formatVideoTime(142), '2:22');
  console.log('[PASS] Video timestamp formatting handles minutes and seconds properly.');
}

testLoadingState();
testUnavailableState();
testPlaybackErrorState();
testReadyStateAndPrivacy();
testTimeFormatter();

console.log('[ALL PASS] Contribution 66 test suite passed.');
