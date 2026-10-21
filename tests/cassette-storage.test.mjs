import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  saveCassette,
  loadCassette,
  listCassettes,
  recordInteraction,
  deleteCassette,
  inferProvider,
} from '../src/lib/replay/cassette-storage.ts';

console.log('--- Testing Cassette Storage & File Format Engine (Contribution 143) ---');

const testDir = path.join(process.cwd(), '.proofix', 'test_cassettes');

async function cleanupTestDir() {
  if (fs.existsSync(testDir)) {
    await fs.promises.rm(testDir, { recursive: true, force: true });
  }
}

function testProviderInference() {
  assert.equal(inferProvider('https://api.stripe.com/v1/charges'), 'stripe');
  assert.equal(inferProvider('https://api.github.com/repos/octocat'), 'github');
  assert.equal(inferProvider('https://api.openai.com/v1/chat/completions'), 'openai');
  assert.equal(inferProvider('https://api.twilio.com/2010-04-01/Accounts'), 'twilio');
  assert.equal(inferProvider('https://tenant.auth0.com/oauth/token'), 'auth0');
  console.log('[PASS] Provider correctly inferred from hostname.');
}

async function testCassetteLifecycle() {
  await cleanupTestDir();

  const cassetteName = 'ci_test_checkout_flow';

  // 1. Record first interaction
  const updated1 = await recordInteraction(
    cassetteName,
    {
      request: {
        method: 'POST',
        url: 'https://api.stripe.com/v1/customers',
        path: '/v1/customers',
        queryParams: {},
        headers: { 'content-type': 'application/json' },
        body: '{"email":"test@proofix.dev"}',
        timestamp: new Date().toISOString(),
      },
      response: {
        statusCode: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        body: '{"id":"cus_123"}',
        durationMs: 50,
      },
    },
    testDir
  );

  assert.equal(updated1.name, cassetteName);
  assert.equal(updated1.interactions.length, 1);
  assert.equal(updated1.interactions[0].provider, 'stripe');

  // 2. Record second interaction (GitHub)
  const updated2 = await recordInteraction(
    cassetteName,
    {
      request: {
        method: 'GET',
        url: 'https://api.github.com/user',
        path: '/user',
        queryParams: {},
        headers: {},
        timestamp: new Date().toISOString(),
      },
      response: {
        statusCode: 200,
        statusText: 'OK',
        headers: {},
        body: '{"login":"octocat"}',
        durationMs: 35,
      },
    },
    testDir
  );

  assert.equal(updated2.interactions.length, 2);
  assert.equal(updated2.interactions[1].order, 2);
  assert.equal(updated2.interactions[1].provider, 'github');

  // 3. Load cassette from disk
  const loaded = await loadCassette(cassetteName, testDir);
  assert.ok(loaded);
  assert.equal(loaded.interactions.length, 2);
  assert.ok(loaded.metadata.providers.includes('stripe'));
  assert.ok(loaded.metadata.providers.includes('github'));

  // 4. List cassettes
  const all = await listCassettes(testDir);
  assert.equal(all.length, 1);
  assert.equal(all[0].name, cassetteName);

  // 5. Delete cassette
  const deleted = await deleteCassette(cassetteName, testDir);
  assert.equal(deleted, true);
  const reloaded = await loadCassette(cassetteName, testDir);
  assert.equal(reloaded, null);

  await cleanupTestDir();
  console.log('[PASS] Full cassette lifecycle: create, append, load, list, and delete verified.');
}

testProviderInference();
await testCassetteLifecycle();

console.log('\nAll Contribution 143 tests passed cleanly!');
