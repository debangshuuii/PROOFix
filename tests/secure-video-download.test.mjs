import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { validateDownloadAccess } from '../src/lib/video/secure-download.ts';

console.log('--- Testing Secure Video Downloads & Access Control (Contribution 68) ---');

function createMockDbProvider(options = {}) {
  const projects = new Map([
    [
      'proj_confidential_01',
      {
        id: 'proj_confidential_01',
        ownerId: 'usr_authorized_dev',
        name: 'Confidential Production App',
      },
    ],
  ]);

  const runs = new Map([
    [
      'run_sec_100',
      {
        id: 'run_sec_100',
        projectId: 'proj_confidential_01',
        status: 'completed',
      },
    ],
  ]);

  return {
    async getProjectById(id) {
      return projects.get(id) || null;
    },
    async getRunById(id) {
      return runs.get(id) || null;
    },
  };
}

async function runTests() {
  const mockDb = createMockDbProvider();
  const testRunId = 'run_sec_100';
  const testProjectId = 'proj_confidential_01';
  const ownerUserId = 'usr_authorized_dev';
  const unauthorizedUserId = 'usr_unauthorized_attacker';

  // Create temporary test artifact on disk
  const testArtifactsDir = path.join(process.cwd(), 'public', 'artifacts', 'runs', testRunId, 'videos');
  fs.mkdirSync(testArtifactsDir, { recursive: true });
  const videoFileName = 'test_01.webm';
  const diskPath = path.join(testArtifactsDir, videoFileName);
  fs.writeFileSync(diskPath, Buffer.alloc(1024, 0x1a)); // 1KB sample webm

  try {
    // Test 1: Authorized project owner download
    const authResult = await validateDownloadAccess({
      projectId: testProjectId,
      runId: testRunId,
      videoIdOrName: videoFileName,
      requesterUserId: ownerUserId,
      dbInstance: mockDb,
    });

    assert.equal(authResult.authorized, true);
    assert.equal(authResult.statusCode, 200);
    assert.equal(authResult.headers?.['Content-Type'], 'video/webm');
    assert.ok(authResult.headers?.['Content-Disposition']?.includes('attachment; filename='));
    assert.equal(authResult.sizeBytes, 1024);
    console.log('[PASS] Authorized project owner can download session video recording.');

    // Test 2: CRITICAL - Access check prevents unauthorized user from downloading recording
    // "Done when: access checks prevent users from downloading recordings belonging to unauthorized projects."
    const unauthResult = await validateDownloadAccess({
      projectId: testProjectId,
      runId: testRunId,
      videoIdOrName: videoFileName,
      requesterUserId: unauthorizedUserId,
      dbInstance: mockDb,
    });

    assert.equal(unauthResult.authorized, false);
    assert.equal(unauthResult.statusCode, 403);
    assert.ok(unauthResult.errorMessage?.includes('Access denied'));
    console.log('[PASS] Access checks strictly prevent downloading recordings belonging to unauthorized projects.');

    // Test 3: Non-existent project
    const notFoundProj = await validateDownloadAccess({
      projectId: 'non_existent_project',
      runId: testRunId,
      videoIdOrName: videoFileName,
      requesterUserId: ownerUserId,
      dbInstance: mockDb,
    });
    assert.equal(notFoundProj.authorized, false);
    assert.equal(notFoundProj.statusCode, 404);
    console.log('[PASS] Non-existent project returns 404 Not Found.');

    // Test 4: Path traversal protection
    const traversalResult = await validateDownloadAccess({
      projectId: testProjectId,
      runId: testRunId,
      videoIdOrName: '../../../../windows/system.ini',
      requesterUserId: ownerUserId,
      dbInstance: mockDb,
    });
    assert.equal(traversalResult.authorized, false);
    assert.equal(traversalResult.statusCode, 400);
    assert.ok(traversalResult.errorMessage?.includes('Path traversal'));
    console.log('[PASS] Path traversal attempts in video identifier are strictly rejected.');

    // Test 5: Missing video file
    const missingVideo = await validateDownloadAccess({
      projectId: testProjectId,
      runId: testRunId,
      videoIdOrName: 'missing_file.webm',
      requesterUserId: ownerUserId,
      dbInstance: mockDb,
    });
    assert.equal(missingVideo.authorized, false);
    assert.equal(missingVideo.statusCode, 404);
    console.log('[PASS] Non-existent video file returns 404 Not Found.');
  } finally {
    // Cleanup test artifact
    const runDir = path.dirname(testArtifactsDir);
    if (fs.existsSync(runDir)) {
      fs.rmSync(runDir, { recursive: true, force: true });
    }
  }
}

runTests()
  .then(() => {
    console.log('[ALL PASS] Contribution 68 test suite passed.');
  })
  .catch((err) => {
    console.error('[FAIL] Secure video download test failed:', err);
    process.exit(1);
  });
