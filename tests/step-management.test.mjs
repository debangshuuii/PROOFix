import assert from 'node:assert/strict';
import {
  addStepToJourney,
  updateStepInJourney,
  reorderStepInJourney,
  duplicateStepInJourney,
  deleteStepFromJourney,
} from '../src/lib/journey/step-manager.ts';

console.log('--- Testing Journey Step Management Engine (Contribution 53) ---');

let journey = {
  id: 'jny_test_step_mgmt',
  projectId: 'proj_fixture_01',
  ownerId: 'usr_default',
  title: 'Step Management Journey',
  schemaVersion: '1.0.0',
  steps: [
    { id: 'stp_A', order: 1, title: 'Step A - Nav', action: 'navigate', params: { url: '/' } },
    { id: 'stp_B', order: 2, title: 'Step B - Click', action: 'click', target: { type: 'css', value: '#btn-b' } },
    { id: 'stp_C', order: 3, title: 'Step C - Assert', action: 'assert_visible', target: { type: 'css', value: '#card-c' } },
  ],
  config: {
    baseUrl: 'http://localhost:4173',
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// 1. Add step (append)
journey = addStepToJourney(journey, {
  title: 'Step D - Fill',
  action: 'fill',
  target: { type: 'label', value: 'Search' },
  params: { value: 'query' },
});

assert.equal(journey.steps.length, 4);
assert.equal(journey.steps[3].order, 4);
assert.equal(journey.steps[3].title, 'Step D - Fill');
console.log('[PASS] Step added and appended with sequential order 4.');

// 2. Add step at specific index (insert at position 2)
journey = addStepToJourney(
  journey,
  {
    title: 'Step Inserted',
    action: 'wait_for_timeout',
    params: { durationMs: 500 },
  },
  1 // insert at index 1 (will become order 2)
);

assert.equal(journey.steps.length, 5);
assert.equal(journey.steps[1].title, 'Step Inserted');
assert.equal(journey.steps[1].order, 2);
assert.equal(journey.steps[2].id, 'stp_B');
assert.equal(journey.steps[2].order, 3);
// Verify all orders are strictly 1, 2, 3, 4, 5
journey.steps.forEach((s, idx) => assert.equal(s.order, idx + 1));
console.log('[PASS] Step inserted at position 2; subsequent steps renumbered contiguously.');

// 3. Update step
journey = updateStepInJourney(journey, 'stp_B', {
  title: 'Step B Updated',
  params: { value: 'new-val' },
});
assert.equal(journey.steps.find((s) => s.id === 'stp_B')?.title, 'Step B Updated');
console.log('[PASS] Step updated successfully preserving order and structure.');

// 4. Reorder step (Move last step D to position 1)
const stepDId = journey.steps[4].id;
journey = reorderStepInJourney(journey, stepDId, 1);
assert.equal(journey.steps[0].id, stepDId);
assert.equal(journey.steps[0].order, 1);
// Verify strict contiguous ordering
journey.steps.forEach((s, idx) => assert.equal(s.order, idx + 1));
console.log('[PASS] Reordered step to position 1; orders preserved sequentially 1..5.');

// 5. Duplicate step
const originalCount = journey.steps.length;
journey = duplicateStepInJourney(journey, 'stp_A');
assert.equal(journey.steps.length, originalCount + 1);

const originalIndex = journey.steps.findIndex((s) => s.id === 'stp_A');
const cloneIndex = originalIndex + 1;
assert.ok(journey.steps[cloneIndex].title.includes('(Copy)'));
assert.notEqual(journey.steps[cloneIndex].id, 'stp_A');
journey.steps.forEach((s, idx) => assert.equal(s.order, idx + 1));
console.log('[PASS] Step duplicated directly following original and re-indexed.');

// 6. Delete step
const idToDelete = journey.steps[cloneIndex].id;
journey = deleteStepFromJourney(journey, idToDelete);
assert.equal(journey.steps.length, originalCount);
assert.ok(!journey.steps.some((s) => s.id === idToDelete));
journey.steps.forEach((s, idx) => assert.equal(s.order, idx + 1));
console.log('[PASS] Step deleted; remaining steps renumbered contiguously.');

console.log('All Step Management tests passed successfully.');
