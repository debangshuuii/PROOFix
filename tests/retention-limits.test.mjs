import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { enforceVideoRetention } from '../src/lib/video/retention-cleaner.ts';

console.log('--- Testing Retention and Storage Limits (Contribution 69) ---');

const testBaseDir = path.join(process.cwd(), 'public', 'artifacts', 'test_retention_suite');

function setupTestFiles() {
  if (fs.existsSync(testBaseDir)) {
    fs.rmSync(testBaseDir, { recursive: true, force: true });
  }

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  // 1. Expired completed run (created 20 days ago)
  const expiredRunId = 'run_expired_completed';
  const expiredDir = path.join(testBaseDir, 'runs', expiredRunId, 'videos');
  fs.mkdirSync(expiredDir, { recursive: true });
  const expiredFile = path.join(expiredDir, 'test_01.webm');
  fs.writeFileSync(expiredFile, Buffer.alloc(50000, 0x01)); // 50KB
  // Set mtime to 20 days ago
  const expiredTime = (now - 20 * dayMs) / 1000;
  fs.utimesSync(expiredFile, expiredTime, expiredTime);

  // 2. Active run (created 25 days ago - OLD, but STILL ACTIVE/RUNNING!)
  const activeRunId = 'run_long_active_job';
  const activeDir = path.join(testBaseDir, 'runs', activeRunId, 'videos');
  fs.mkdirSync(activeDir, { recursive: true });
  const activeFile = path.join(activeDir, 'test_recording.webm');
  fs.writeFileSync(activeFile, Buffer.alloc(60000, 0x02)); // 60KB
  const activeTime = (now - 25 * dayMs) / 1000;
  fs.utimesSync(activeFile, activeTime, activeTime);

  // 3. Recent completed run (created 2 days ago)
  const recentRunId = 'run_recent_completed';
  const recentDir = path.join(testBaseDir, 'runs', recentRunId, 'videos');
  fs.mkdirSync(recentDir, { recursive: true });
  const recentFile = path.join(recentDir, 'test_recent.webm');
  fs.writeFileSync(recentFile, Buffer.alloc(40000, 0x03)); // 40KB
  const recentTime = (now - 2 * dayMs) / 1000;
  fs.utimesSync(recentFile, recentTime, recentTime);

  return {
    expiredFile,
    activeFile,
    recentFile,
    activeRunId,
    expiredRunId,
    recentRunId,
  };
}

async function runTests() {
  const env = setupTestFiles();

  try {
    // 1. Run retention cleaner with maxAgeDays = 14 and active run preserved
    const result = await enforceVideoRetention({
      baseArtifactsDir: testBaseDir,
      maxAgeDays: 14,
      maxTotalStorageMb: 10,
      activeRunIds: [env.activeRunId],
    });

    console.log(`Checked: ${result.checkedCount}, Deleted: ${result.deletedCount}, Reclaimed: ${result.bytesReclaimed} bytes`);
    console.log(`Active preserved: ${result.activeRunsPreserved.join(', ')}`);

    // Verify:
    // a) Expired completed file was safely deleted
    assert.equal(fs.existsSync(env.expiredFile), false, 'Expired completed run video must be deleted');
    assert.equal(result.deletedCount, 1);
    assert.equal(result.bytesReclaimed, 50000);

    // b) CRITICAL: Active run video was preserved even though it is older than 14 days!
    assert.equal(fs.existsSync(env.activeFile), true, 'Active run video MUST NEVER be deleted');
    assert.ok(result.activeRunsPreserved.includes(env.activeRunId));

    // c) Recent completed file was preserved
    assert.equal(fs.existsSync(env.recentFile), true, 'Recent completed run video must be preserved');

    console.log('[PASS] Expired videos cleaned up while actively running jobs are strictly preserved.');

    // 2. Storage Limit Enforcer: Purges oldest file when quota is exceeded
    const quotaResult = await enforceVideoRetention({
      baseArtifactsDir: testBaseDir,
      maxAgeDays: 30, // all within age
      maxTotalStorageMb: 0.05, // 50KB limit -> existing remaining files exceed limit
      activeRunIds: [env.activeRunId], // Active run still protected
    });

    // Recent completed file should be deleted to satisfy quota, while active run remains protected
    assert.equal(fs.existsSync(env.recentFile), false, 'Recent completed file purged to meet quota limit');
    assert.equal(fs.existsSync(env.activeFile), true, 'Active run STILL protected from storage quota purge');
    console.log('[PASS] Storage quota limits enforced by oldest-first purge respecting active runs.');

    // 3. Observable errors test
    // Provide a non-existent or invalid directory to observe error reporting
    const errResult = await enforceVideoRetention({
      baseArtifactsDir: testBaseDir,
      dbProvider: {
        async getRuns() {
          throw new Error('Database connection timeout');
        },
      },
    });

    assert.ok(errResult.errors.length > 0, 'Cleanup failures must be observable in errors array');
    assert.ok(errResult.errors[0].includes('Database connection timeout'));
    console.log(`[PASS] Observable errors captured: "${errResult.errors[0]}".`);
  } finally {
    if (fs.existsSync(testBaseDir)) {
      fs.rmSync(testBaseDir, { recursive: true, force: true });
    }
  }
}

runTests()
  .then(() => {
    console.log('[ALL PASS] Contribution 69 test suite passed.');
  })
  .catch((err) => {
    console.error('[FAIL] Retention limits test error:', err);
    process.exit(1);
  });
