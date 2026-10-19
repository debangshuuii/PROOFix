import assert from 'node:assert/strict';
import { db } from '../src/lib/db/index.ts';

console.log('--- Testing Journey Persistence & Access Control (Contribution 57) ---');

async function testPersistence() {
  const aliceUserId = 'usr_alice';
  const bobUserId = 'usr_bob';
  const journeyId = `jny_persist_test_${Date.now()}`;

  const journeyData = {
    id: journeyId,
    projectId: 'proj_fixture_01',
    ownerId: aliceUserId,
    title: 'Alice Secure Checkout Journey',
    description: 'Testing persistence across reload and authorization bounds',
    schemaVersion: '1.0.0',
    steps: [
      {
        id: 'stp_1',
        order: 1,
        title: 'Open Store Page',
        action: 'navigate',
        params: { url: '/store' },
      },
      {
        id: 'stp_2',
        order: 2,
        title: 'Click Checkout',
        action: 'click',
        target: { type: 'role_name', role: 'button', name: 'Checkout' },
      },
    ],
    config: {
      baseUrl: 'http://localhost:4173',
      defaultTimeoutMs: 12000,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // 1. Save Journey (Alice)
  await db.saveJourney(journeyData, aliceUserId);
  console.log('[PASS] Journey saved to persistence layer.');

  // 2. Load Journey & verify survives reload
  const loadedAlice = await db.getJourneyById(journeyId, aliceUserId);
  assert.ok(loadedAlice);
  assert.equal(loadedAlice.id, journeyId);
  assert.equal(loadedAlice.title, 'Alice Secure Checkout Journey');
  assert.equal(loadedAlice.steps.length, 2);
  console.log('[PASS] Saved journey loaded and survived persistence reload.');

  // 3. Authorization: Unauthorized user (Bob) CANNOT access Alice's journey
  await assert.rejects(async () => {
    await db.getJourneyById(journeyId, bobUserId);
  }, /Access denied: User "usr_bob" is not authorized/);
  console.log('[PASS] Unauthorized user prevented from accessing another user\'s journey.');

  // 4. Authorization: Bob CANNOT rename Alice's journey
  await assert.rejects(async () => {
    await db.renameJourney(journeyId, 'Hacked Journey Title', bobUserId);
  }, /Access denied: User "usr_bob" cannot rename journey/);
  console.log('[PASS] Unauthorized user prevented from renaming another user\'s journey.');

  // 5. Authorization: Bob CANNOT delete Alice's journey
  await assert.rejects(async () => {
    await db.deleteJourney(journeyId, bobUserId);
  }, /Access denied: User "usr_bob" cannot delete journey/);
  console.log('[PASS] Unauthorized user prevented from deleting another user\'s journey.');

  // 6. Authorized rename (Alice)
  const renamed = await db.renameJourney(journeyId, 'Alice Premium Checkout Journey', aliceUserId);
  assert.equal(renamed.title, 'Alice Premium Checkout Journey');
  const verifyRenamed = await db.getJourneyById(journeyId, aliceUserId);
  assert.equal(verifyRenamed?.title, 'Alice Premium Checkout Journey');
  console.log('[PASS] Authorized journey rename succeeded and persisted.');

  // 7. Authorized duplicate (Alice)
  const duplicated = await db.duplicateJourney(journeyId, aliceUserId, 'Alice Checkout Copy');
  assert.notEqual(duplicated.id, journeyId);
  assert.equal(duplicated.title, 'Alice Checkout Copy');
  assert.equal(duplicated.steps.length, 2);
  console.log(`[PASS] Journey duplicated with new ID "${duplicated.id}".`);

  // 8. Authorized delete (Alice)
  const deleted = await db.deleteJourney(journeyId, aliceUserId);
  assert.equal(deleted, true);
  const lookupDeleted = await db.getJourneyById(journeyId, aliceUserId);
  assert.equal(lookupDeleted, null);

  // Clean up duplicate
  await db.deleteJourney(duplicated.id, aliceUserId);
  console.log('[PASS] Journey deleted and confirmed removed from persistence.');

  console.log('All Journey Persistence & Access Control tests passed successfully.');
}

testPersistence().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
