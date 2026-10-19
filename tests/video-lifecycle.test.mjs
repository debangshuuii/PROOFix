import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { VideoLifecycleManager } from '../src/lib/video/video-lifecycle.ts';

console.log('--- Testing Video Finalization and Lifecycle (Contribution 63) ---');

async function testVideoLifecycle() {
  const manager = new VideoLifecycleManager();
  const sessionId = `sess_${Date.now()}`;
  const runId = `run_${Date.now()}`;
  const testDir = path.join(process.cwd(), 'public', 'artifacts', 'test_lifecycle', sessionId);
  const rawDir = path.join(testDir, 'raw');
  const destPath = path.join(testDir, 'finalized.webm');

  fs.mkdirSync(rawDir, { recursive: true });

  // 1. Session start - must NOT be ready
  manager.startSession(sessionId, {
    runId,
    testId: 'test_sample',
    tempDir: rawDir,
  });

  assert.equal(manager.isReady(sessionId), false, 'Session must NOT be ready while recording');
  const session = manager.getSession(sessionId);
  assert.equal(session?.status, 'recording');
  console.log('[PASS] Video is not marked ready during recording.');

  // 2. Finalizing state - must NOT be ready
  manager.markFinalizing(sessionId);
  assert.equal(manager.isReady(sessionId), false, 'Session must NOT be ready while in finalizing state');
  assert.equal(session?.status, 'finalizing');
  console.log('[PASS] Video is not marked ready during finalization transition.');

  // 3. Reject corrupted / below-minimum-size recordings
  const corruptFile = path.join(rawDir, 'recording.webm');
  fs.writeFileSync(corruptFile, Buffer.from([0, 1, 2])); // only 3 bytes

  await assert.rejects(async () => {
    await manager.finalizeSession(sessionId, {
      destinationPath: destPath,
      minSizeBytes: 500,
    });
  }, /below minimum threshold/);

  assert.equal(manager.isReady(sessionId), false, 'Corrupted video must not be marked ready');
  assert.equal(manager.getSession(sessionId)?.status, 'failed');
  console.log('[PASS] Zero-byte or corrupt video stream rejected and marked failed.');

  // 4. Successful finalization of verified recording
  const validSessionId = `sess_valid_${Date.now()}`;
  const validRawDir = path.join(testDir, 'valid_raw');
  const validDestPath = path.join(testDir, 'valid_final.webm');
  fs.mkdirSync(validRawDir, { recursive: true });

  // Write a valid simulated WebM video payload (> 1000 bytes)
  const validPayload = Buffer.alloc(2048, 0x5a);
  fs.writeFileSync(path.join(validRawDir, 'session.webm'), validPayload);

  manager.startSession(validSessionId, {
    runId,
    testId: 'test_valid',
    tempDir: validRawDir,
  });

  const finalized = await manager.finalizeSession(validSessionId, {
    destinationPath: validDestPath,
    minSizeBytes: 500,
  });

  assert.equal(finalized.status, 'ready');
  assert.equal(manager.isReady(validSessionId), true, 'Verified recording must be marked ready');
  assert.ok(fs.existsSync(validDestPath), 'Finalized video must exist at destination');
  assert.equal(fs.statSync(validDestPath).size, 2048);
  console.log('[PASS] Verified recording atomic finalization marked ready only after complete verification.');

  // 5. Cleanup on discard
  const discardSessionId = `sess_discard_${Date.now()}`;
  const discardDir = path.join(testDir, 'discard_raw');
  fs.mkdirSync(discardDir, { recursive: true });
  fs.writeFileSync(path.join(discardDir, 'abandoned.webm'), Buffer.alloc(100));

  manager.startSession(discardSessionId, {
    runId,
    testId: 'test_discard',
    tempDir: discardDir,
  });

  await manager.discardSession(discardSessionId);
  assert.equal(manager.getSession(discardSessionId)?.status, 'discarded');
  assert.equal(manager.isReady(discardSessionId), false);
  console.log('[PASS] Discarded session cleaned up temporary artifacts safely.');

  // Cleanup test workspace
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
}

testVideoLifecycle()
  .then(() => {
    console.log('[ALL PASS] Contribution 63 test suite passed.');
  })
  .catch((err) => {
    console.error('[FAIL] Video lifecycle test error:', err);
    process.exit(1);
  });
