import test from 'node:test';
import assert from 'node:assert/strict';
import {
  StateGraphTraverser,
  globalStateGraphTraverser,
} from '../src/lib/crawler/state-graph-traverser.ts';

test('computeStateHash produces deterministic hash for identical DOM states', () => {
  const traverser = new StateGraphTraverser();
  const elems = [
    { id: '1', type: 'button', selector: 'button.save', text: 'Save' },
    { id: '2', type: 'link', selector: 'a[href="/"]', text: 'Home' },
  ];

  const hash1 = traverser.computeStateHash('https://app.com/dashboard', elems);
  const hash2 = traverser.computeStateHash('https://app.com/dashboard', elems);
  assert.equal(hash1, hash2);
  assert.equal(hash1.length, 16);
});

test('registerNode increments visit counts and detects cycle traps', () => {
  const traverser = new StateGraphTraverser();
  const elems = [{ id: '1', type: 'button', selector: 'button', text: 'Next' }];

  const node1 = traverser.registerNode('https://app.com/page1', 'Page 1', elems, 0);
  assert.equal(node1.visitedCount, 1);
  assert.equal(traverser.isCycleTrap(node1.id, 2), false);

  traverser.registerNode('https://app.com/page1', 'Page 1', elems, 0);
  assert.equal(traverser.isCycleTrap(node1.id, 2), true);
});

test('getShortestPathToNode reconstructs reproduction action sequence using BFS', () => {
  const traverser = new StateGraphTraverser();

  const nodeA = traverser.registerNode('https://app.com/home', 'Home', [], 0);
  const nodeB = traverser.registerNode('https://app.com/pricing', 'Pricing', [], 1);
  const nodeC = traverser.registerNode('https://app.com/checkout', 'Checkout', [], 2);

  const action1 = { type: 'click', selector: 'a[href="/pricing"]', rationale: 'Go to pricing' };
  const action2 = { type: 'click', selector: 'button.checkout', rationale: 'Proceed to checkout' };

  traverser.recordTransition(nodeA.id, nodeB.id, action1, 50);
  traverser.recordTransition(nodeB.id, nodeC.id, action2, 80);

  const path = traverser.getShortestPathToNode(nodeC.id);
  assert.equal(path.length, 2);
  assert.equal(path[0].selector, 'a[href="/pricing"]');
  assert.equal(path[1].selector, 'button.checkout');
});
