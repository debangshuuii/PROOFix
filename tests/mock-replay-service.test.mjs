import assert from 'node:assert/strict';
import {
  MockReplayService,
  globalMockReplayService,
} from '../src/lib/replay/mock-replay-service.ts';
import fs from 'node:fs';
import path from 'node:path';

console.log('--- Testing Mock Replay Manager Service & REST API (Contribution 148) ---');

async function testSessionLifecycle() {
  const service = new MockReplayService();
  const runId = 'run_srv_test_01';

  // 1. Start session with Stripe preset fallback
  const session = await service.startSession(runId, {
    mode: 'replay',
    cassetteId: 'stripe',
  });

  assert.equal(session.runId, runId);
  assert.equal(session.mode, 'replay');
  assert.ok(session.cassette);
  assert.equal(session.cassette.interactions[0].provider, 'stripe');

  // 2. Retrieve session
  const retrieved = service.getSession(runId);
  assert.ok(retrieved);
  assert.equal(retrieved.id, session.id);

  // 3. Add dynamic fault rule
  const faultAdded = service.addFaultRule(runId, {
    id: 'f_dyn_1',
    name: 'Dynamic 503 Outage',
    enabled: true,
    faultType: 'http_status_override',
    params: { statusCode: 503 },
  });
  assert.equal(faultAdded, true);
  assert.equal(service.getSession(runId).activeFaultRules.length, 1);

  // 4. Retrieve interceptor
  const interceptor = service.getInterceptor(runId);
  assert.ok(interceptor);
  assert.equal(interceptor.getStats().totalRequestsIntercepted, 0);

  // 5. Stop session
  const stopped = await service.stopSession(runId);
  assert.ok(stopped);
  assert.equal(service.getSession(runId), undefined);

  console.log('[PASS] Replay service manages session lifecycle, preset loading, and fault rules.');
}

function testApiRouteFiles() {
  const routePath = path.resolve(process.cwd(), 'src/app/api/v1/replay/route.ts');
  assert.ok(fs.existsSync(routePath), 'Replay API route must exist');

  const content = fs.readFileSync(routePath, 'utf8');
  assert.ok(content.includes('export async function GET'));
  assert.ok(content.includes('export async function POST'));
  assert.ok(content.includes('globalMockReplayService'));
  console.log('[PASS] Replay API route exports GET and POST handlers.');
}

await testSessionLifecycle();
testApiRouteFiles();

console.log('\nAll Contribution 148 tests passed cleanly!');
