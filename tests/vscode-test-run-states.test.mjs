import assert from 'node:assert/strict';
import { ProofixTestController } from '../extensions/vscode-proofix/src/test-controller.ts';

console.log('Testing TestRun State Transitions...');

const controller = new ProofixTestController();
controller.populateFromRoutes([
  {
    routePath: '/checkout',
    filePath: 'src/app/checkout/page.tsx',
    line: 5,
    isApi: false,
    isDynamic: false,
  },
]);

const journeyId = 'journey:/checkout:smoke';

// 1. Initial State: enqueued
const initialNode = controller.getNodeById(journeyId);
assert.ok(initialNode);
assert.equal(initialNode.status, 'enqueued');

// 2. Running State
controller.updateTestStatus(journeyId, 'running');
assert.equal(controller.getNodeById(journeyId)?.status, 'running');

// 3. Failed State with error message
controller.updateTestStatus(journeyId, 'failed', 1250, 'Navigation timed out after 5000ms');
const failedNode = controller.getNodeById(journeyId);
assert.equal(failedNode?.status, 'failed');
assert.equal(failedNode?.durationMs, 1250);
assert.equal(failedNode?.error, 'Navigation timed out after 5000ms');

// 4. Passed State on rerun
controller.updateTestStatus(journeyId, 'passed', 420);
const passedNode = controller.getNodeById(journeyId);
assert.equal(passedNode?.status, 'passed');
assert.equal(passedNode?.durationMs, 420);

console.log('✅ TestRun State Transitions tests passed!');
