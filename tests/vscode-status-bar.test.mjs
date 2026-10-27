import assert from 'node:assert/strict';
import { ProofixStatusBarItem } from '../extensions/vscode-proofix/src/status-bar.ts';

console.log('Testing Proofix StatusBar Item...');

const bar = new ProofixStatusBarItem();

// 1. Initial State
const init = bar.render();
assert.equal(init.text, '$(shield) PROOFix');

// 2. Running State
const running = bar.setRunning(true);
assert.ok(running.text.includes('$(sync~spin)'));
assert.equal(running.color, '#38bdf8');

// 3. Proven State
bar.setRunning(false);
const proven = bar.setCounts(5, 0, 5);
assert.equal(proven.text, '$(shield) PROOFix: 5 Proven');
assert.equal(proven.color, '#10b981');

// 4. Failing State
const failing = bar.setCounts(3, 2, 5);
assert.equal(failing.text, '$(alert) PROOFix: 2 Failing');
assert.equal(failing.color, '#ef4444');

// 5. Update from RouteStatuses
const updated = bar.updateFromRouteStatuses([
  { status: 'proven' },
  { status: 'proven' },
]);
assert.equal(updated.text, '$(shield) PROOFix: 2 Proven');

console.log('✅ Proofix StatusBar Item tests passed!');
