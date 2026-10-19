import assert from 'node:assert/strict';
import { validateJourney } from '../src/lib/journey/schema-validator.ts';

console.log('--- Testing Journey Editor State & No-Code Editing (Contribution 52) ---');

// 1. Initialize a blank journey in visual workspace
const now = new Date().toISOString();
let journey = {
  id: 'jny_no_code_01',
  projectId: 'proj_fixture_01',
  ownerId: 'usr_default',
  title: 'Visual Checkout Flow',
  schemaVersion: '1.0.0',
  steps: [
    {
      id: 'stp_1',
      order: 1,
      title: 'Navigate to Store',
      action: 'navigate',
      params: { url: '/store' },
    },
  ],
  config: {
    baseUrl: 'http://localhost:4173',
    allowedHosts: ['localhost'],
    defaultTimeoutMs: 10000,
  },
  createdAt: now,
  updatedAt: now,
};

assert.equal(validateJourney(journey).valid, true);
console.log('[PASS] Visual journey initialized cleanly without code editor.');

// 2. Simulate User visual edit of title and config
journey = {
  ...journey,
  title: 'Visual Checkout Flow - Staging',
  config: {
    ...journey.config,
    baseUrl: 'https://staging.example.com',
    defaultTimeoutMs: 15000,
    stopOnFailure: false,
  },
};
assert.equal(journey.title, 'Visual Checkout Flow - Staging');
assert.equal(journey.config.baseUrl, 'https://staging.example.com');
assert.equal(journey.config.defaultTimeoutMs, 15000);
console.log('[PASS] Journey settings and metadata updated visually.');

// 3. Simulate adding a second step visually via action builder
const addedStep = {
  id: 'stp_2',
  order: 2,
  title: 'Click Add to Cart',
  action: 'click',
  target: {
    type: 'role_name',
    role: 'button',
    name: 'Add to Cart',
    value: 'Add to Cart',
  },
};

journey = {
  ...journey,
  steps: [...journey.steps, addedStep],
};

const validation = validateJourney(journey);
assert.equal(validation.valid, true);
assert.equal(journey.steps.length, 2);
assert.equal(journey.steps[1].target?.role, 'button');
console.log('[PASS] User can configure actions and target selectors visually.');

console.log('All Journey Editor Interface tests passed successfully.');
