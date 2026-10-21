import assert from 'node:assert/strict';
import {
  generateNumericBoundaryValues,
  generateStringBoundaryValues,
  generateTypeConfusionValues,
  generatePayloadsForEndpoint,
} from '../src/lib/fuzzing/payload-mutator.ts';

console.log('--- Testing Boundary Value & Type Confusion Payload Mutator (Contribution 133) ---');

function testNumericBoundaries() {
  const schema = { minimum: 10, maximum: 50 };
  const context = { endpointId: 'ep_test', targetParameter: 'age' };
  const payloads = generateNumericBoundaryValues(schema, context);

  assert.ok(payloads.length >= 8);
  const values = payloads.map((p) => p.value);
  assert.ok(values.includes(0));
  assert.ok(values.includes(-1));
  assert.ok(values.includes(10), 'Must include exact minimum (10)');
  assert.ok(values.includes(9), 'Must include below minimum (9)');
  assert.ok(values.includes(50), 'Must include exact maximum (50)');
  assert.ok(values.includes(51), 'Must include above maximum (51)');
  assert.ok(values.includes(2147483647), 'Must include 32-bit INT_MAX');

  for (const p of payloads) {
    assert.equal(p.strategy, 'boundary_values');
    assert.equal(p.targetParameter, 'age');
    assert.equal(p.endpointId, 'ep_test');
  }
  console.log('[PASS] Numeric boundary mutations cover min/max offsets, zero, and 32/64-bit integer limits.');
}

function testStringBoundaries() {
  const schema = { minLength: 5, maxLength: 20, enum: ['gold', 'silver', 'bronze'] };
  const context = { endpointId: 'ep_test', targetField: 'tier' };
  const payloads = generateStringBoundaryValues(schema, context);

  assert.ok(payloads.length >= 7);
  const values = payloads.map((p) => p.value);
  assert.ok(values.includes(''), 'Must include empty string');
  assert.ok(values.some((v) => typeof v === 'string' && v.length === 5), 'Must include exact min length (5)');
  assert.ok(values.some((v) => typeof v === 'string' && v.length === 4), 'Must include below min length (4)');
  assert.ok(values.some((v) => typeof v === 'string' && v.length === 20), 'Must include exact max length (20)');
  assert.ok(values.some((v) => typeof v === 'string' && v.length > 20), 'Must include above max length (70)');
  assert.ok(values.some((v) => typeof v === 'string' && v.includes('INVALID_ENUM')), 'Must test invalid enum value');
  console.log('[PASS] String boundary mutations cover empty, length boundaries, and invalid enum values.');
}

function testTypeConfusion() {
  const context = { endpointId: 'ep_test', targetField: 'quantity' };
  const payloads = generateTypeConfusionValues('integer', context);

  assert.ok(payloads.length >= 4);
  for (const p of payloads) {
    assert.equal(p.strategy, 'type_confusion');
    assert.equal(p.targetField, 'quantity');
  }
  const values = payloads.map((p) => p.value);
  assert.ok(values.some((v) => typeof v === 'string'), 'Must include string where integer expected');
  assert.ok(values.some((v) => typeof v === 'boolean'), 'Must include boolean where integer expected');
  assert.ok(values.some((v) => Array.isArray(v)), 'Must include array where integer expected');
  assert.ok(values.includes(null), 'Must include null where integer expected');
  console.log('[PASS] Type confusion values simulate array/boolean/string/null injection.');
}

function testEndpointPayloadGeneration() {
  const endpoint = {
    id: 'ep_order_create',
    path: '/api/v1/orders',
    method: 'POST',
    parameters: [
      {
        name: 'couponCode',
        in: 'query',
        required: false,
        type: 'string',
        maxLength: 10,
      },
    ],
    requestBody: {
      contentType: 'application/json',
      required: true,
      schema: {
        type: 'object',
        properties: {
          itemsCount: { type: 'integer', minimum: 1, maximum: 99 },
          customerNote: { type: 'string', maxLength: 100 },
        },
      },
    },
    responses: {},
  };

  const payloads = generatePayloadsForEndpoint(endpoint);
  assert.ok(payloads.length > 20, 'Should generate comprehensive suite of payloads');

  // Verify parameters target
  const couponPayloads = payloads.filter((p) => p.targetParameter === 'couponCode');
  assert.ok(couponPayloads.length > 0);

  // Verify request body targets
  const itemsCountPayloads = payloads.filter((p) => p.targetField === 'itemsCount');
  assert.ok(itemsCountPayloads.length > 0);

  const notePayloads = payloads.filter((p) => p.targetField === 'customerNote');
  assert.ok(notePayloads.length > 0);

  console.log('[PASS] Full endpoint mutator accurately associates target parameter and body fields.');
}

testNumericBoundaries();
testStringBoundaries();
testTypeConfusion();
testEndpointPayloadGeneration();

console.log('\nAll Contribution 133 tests passed cleanly!');
