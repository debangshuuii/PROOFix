import assert from 'node:assert/strict';
import { db } from '../src/lib/db/index.ts';
import { verifyProjectOwnership } from '../src/lib/security/ownership.ts';

console.log('--- Testing Webhook Configuration UI & Authorization (Contribution 82) ---');

async function testProjectNotificationAuth() {
  // Set up test projects
  const sampleProject = await db.getProjectById('proj_fixture_01');
  assert.ok(sampleProject, 'proj_fixture_01 must exist');

  // Create an isolated project owned by user_alice
  const aliceProject = {
    id: `proj_alice_${Date.now()}`,
    ownerId: 'usr_alice',
    name: "Alice's Microservice",
    description: 'Private project owned by Alice',
    repoUrl: 'https://github.com/alice/service',
    repoProvider: 'sample_fixture',
    defaultBranch: 'main',
    config: {
      startupCommand: 'npm run start',
      buildCommand: 'npm run build',
      installCommand: 'npm install',
      port: 3000,
      readinessPath: '/',
      timeoutSecs: 30,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await db.createProject(aliceProject);

  try {
    // 1. Authorized Owner (Alice) can read and update settings
    const aliceAuth = { userId: 'usr_alice', role: 'user' };
    const aliceAuthCheck = verifyProjectOwnership(aliceProject, aliceAuth, 'write');
    assert.equal(aliceAuthCheck.authorized, true);

    const updatedSettings = {
      projectId: aliceProject.id,
      enabled: true,
      channels: [
        {
          id: 'ch_alice_slack',
          channelType: 'slack',
          channelName: '#alice-alerts',
          enabled: true,
          hasSecret: true,
          webhookUrlMasked: 'https://hooks.slack.com/services/••••••••12ab',
          notifyOnEvents: ['run.failed', 'regression.detected'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      deliveryPreferences: {
        minSeverity: 'failures_only',
        includeReportLink: true,
        includeSummary: true,
      },
      updatedAt: new Date().toISOString(),
    };

    const saved = await db.saveProjectNotificationSettings(aliceProject.id, updatedSettings, 'usr_alice');
    assert.equal(saved.enabled, true);
    assert.equal(saved.channels.length, 1);
    assert.equal(saved.channels[0].id, 'ch_alice_slack');
    console.log('[PASS] Authorized project owner can configure webhooks and choose triggering events.');

    // 2. Unauthorized User (Bob) CANNOT modify Alice's notification settings
    // "Done when: unauthorized users cannot modify another project's notification settings."
    const bobAuth = { userId: 'usr_bob', role: 'user' };
    const bobAuthCheck = verifyProjectOwnership(aliceProject, bobAuth, 'write');
    assert.equal(bobAuthCheck.authorized, false, 'Bob must not be authorized to modify Alice project');
    assert.ok(bobAuthCheck.reason.includes('Unauthorized'));

    let threwError = false;
    try {
      await db.saveProjectNotificationSettings(
        aliceProject.id,
        {
          ...updatedSettings,
          enabled: false,
        },
        'usr_bob' // Bob attempting mutation
      );
    } catch (err) {
      threwError = true;
      assert.ok(err.message.includes('Unauthorized'), 'Error message must state unauthorized access');
    }

    assert.equal(threwError, true, 'db.saveProjectNotificationSettings must reject unauthorized user');
    console.log('[PASS] Unauthorized user (Bob) is strictly prevented from modifying Alice project notification settings.');

    // 3. Admin user CAN modify settings across projects
    const adminAuth = { userId: 'usr_admin', role: 'admin' };
    const adminAuthCheck = verifyProjectOwnership(aliceProject, adminAuth, 'write');
    assert.equal(adminAuthCheck.authorized, true, 'Admin role must be permitted');

    const adminUpdated = await db.saveProjectNotificationSettings(
      aliceProject.id,
      {
        ...updatedSettings,
        deliveryPreferences: { ...updatedSettings.deliveryPreferences, minSeverity: 'all' },
      },
      'admin'
    );
    assert.equal(adminUpdated.deliveryPreferences.minSeverity, 'all');
    console.log('[PASS] Admin role can administer project notification settings.');
  } finally {
    await db.deleteProject(aliceProject.id);
  }
}

testProjectNotificationAuth()
  .then(() => {
    console.log('[ALL PASS] Contribution 82 test suite passed.');
  })
  .catch((err) => {
    console.error('[FAIL] Webhook config auth test error:', err);
    process.exit(1);
  });
