import test from 'node:test';
import assert from 'node:assert/strict';
import { WatchJourneyMapper } from '../src/lib/cli/watch/journey-mapper.ts';

test('journey-mapper: maps checkout files to ecommerce_checkout', () => {
  const targets = WatchJourneyMapper.mapFiles(['src/app/checkout/CheckoutForm.tsx']);
  assert.equal(targets.length, 1);
  assert.equal(targets[0].scenarioId, 'ecommerce_checkout');
  assert.ok(targets[0].reason.includes('Checkout'));
});

test('journey-mapper: maps clock and timestamp files to hydration_mismatch', () => {
  const targets = WatchJourneyMapper.mapFiles(['src/components/LiveServerClock.tsx']);
  assert.equal(targets.length, 1);
  assert.equal(targets[0].scenarioId, 'hydration_mismatch');
  assert.ok(targets[0].reason.includes('clock'));
});

test('journey-mapper: maps search and query files to sql_injection_preflight', () => {
  const targets = WatchJourneyMapper.mapFiles(['src/app/api/search/route.ts']);
  assert.equal(targets.length, 1);
  assert.equal(targets[0].scenarioId, 'sql_injection_preflight');
  assert.ok(targets[0].reason.includes('Search query'));
});

test('journey-mapper: handles multiple diverse modified files concurrently', () => {
  const targets = WatchJourneyMapper.mapFiles([
    'src/app/checkout/page.tsx',
    'src/app/api/search/route.ts'
  ]);
  assert.equal(targets.length, 2);
  const ids = targets.map((t) => t.scenarioId);
  assert.ok(ids.includes('ecommerce_checkout'));
  assert.ok(ids.includes('sql_injection_preflight'));
});

test('journey-mapper: fallbacks gracefully to default scenario for unknown source files', () => {
  const targets = WatchJourneyMapper.mapFiles(['src/utils/math.ts']);
  assert.equal(targets.length, 1);
  assert.equal(targets[0].scenarioId, 'ecommerce_checkout');
});
