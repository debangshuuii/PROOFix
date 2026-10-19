import assert from 'node:assert/strict';
import path from 'node:path';
import {
  validateJourney,
  serializeJourney,
  deserializeJourney,
  loadJourneyFromFixture,
  CURRENT_SCHEMA_VERSION,
} from '../src/lib/journey/schema-validator.ts';

console.log('--- Testing Versioned User Journey Schema (Contribution 51) ---');

// 1. Load from fixture consistently
const fixturePath = path.join(process.cwd(), 'src', 'fixtures', 'sample-journey.json');
const journey = loadJourneyFromFixture(fixturePath);

assert.equal(journey.id, 'jny_fixture_auth_flow');
assert.equal(journey.schemaVersion, CURRENT_SCHEMA_VERSION);
assert.equal(journey.steps.length, 5);
assert.equal(journey.steps[0].action, 'navigate');
assert.equal(journey.steps[0].params?.url, '/login');
assert.equal(journey.steps[3].action, 'click');
assert.equal(journey.steps[3].target?.role, 'button');
assert.equal(journey.steps[4].action, 'assert_text');
console.log('[PASS] Journey loaded and validated from fixture file consistently.');

// 2. Serialization & Deserialization round-trip
const serialized = serializeJourney(journey);
const deserialized = deserializeJourney(serialized);
assert.deepEqual(deserialized, journey);
console.log('[PASS] Journey survives serialization and deserialization round-trip.');

// 3. Reject unsupported schema version
const badVersion = { ...journey, schemaVersion: '9.9.9' };
const resBadVer = validateJourney(badVersion);
assert.equal(resBadVer.valid, false);
assert.ok(resBadVer.errors.some((e) => e.includes('Unsupported or missing schemaVersion')));
console.log('[PASS] Unsupported schema versions rejected.');

// 4. Reject non-contiguous step orders
const brokenOrder = {
  ...journey,
  steps: [
    { ...journey.steps[0], order: 1 },
    { ...journey.steps[1], order: 5 }, // Skipped 2, 3, 4!
  ],
};
const resOrder = validateJourney(brokenOrder);
assert.equal(resOrder.valid, false);
assert.ok(resOrder.errors.some((e) => e.includes('invalid order')));
console.log('[PASS] Non-contiguous step orders rejected.');

// 5. Reject missing action-specific parameters
const missingUrl = {
  ...journey,
  steps: [{ id: 's1', order: 1, title: 'Broken Nav', action: 'navigate' }], // Missing params.url
};
const resUrl = validateJourney(missingUrl);
assert.equal(resUrl.valid, false);
assert.ok(resUrl.errors.some((e) => e.includes('requires "params.url"')));

const missingFillVal = {
  ...journey,
  steps: [
    {
      id: 's1',
      order: 1,
      title: 'Broken Fill',
      action: 'fill',
      target: { type: 'css', value: '#input' }, // Missing params.value
    },
  ],
};
const resFill = validateJourney(missingFillVal);
assert.equal(resFill.valid, false);
assert.ok(resFill.errors.some((e) => e.includes('requires string "params.value"')));
console.log('[PASS] Missing action parameters strictly rejected.');

// 6. Reject unbounded wait duration
const excessiveWait = {
  ...journey,
  steps: [
    {
      id: 's1',
      order: 1,
      title: 'Excessive Wait',
      action: 'wait_for_timeout',
      params: { durationMs: 9999999 }, // Exceeds 30s limit!
    },
  ],
};
const resWait = validateJourney(excessiveWait);
assert.equal(resWait.valid, false);
assert.ok(resWait.errors.some((e) => e.includes('exceeds maximum bound')));
console.log('[PASS] Excessive wait durations rejected.');

console.log('All Versioned Journey Schema tests passed successfully.');
