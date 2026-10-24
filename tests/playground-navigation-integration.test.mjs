import test from 'node:test';
import assert from 'node:assert/strict';
import { globalCommandIndexer } from '../src/lib/navigation/command-indexer.ts';

test('globalCommandIndexer indexes zero-setup playground overview action', () => {
  const actions = globalCommandIndexer.getAllActions();
  const playgroundAction = actions.find((a) => a.id === 'demo-playground-overview');

  assert.ok(playgroundAction, 'Must find demo-playground-overview action');
  assert.equal(playgroundAction.href, '/#playground');
  assert.ok(playgroundAction.badge?.includes('10s Demo'));
  assert.ok(playgroundAction.keywords.includes('playground'));
});

test('globalCommandIndexer indexes all 3 demo defect scenarios', () => {
  const actions = globalCommandIndexer.getAllActions();

  const checkoutAction = actions.find((a) => a.id === 'demo-scenario-checkout');
  assert.ok(checkoutAction, 'Must index checkout scenario action');
  assert.ok(checkoutAction.title.includes('Broken E-Commerce Checkout'));

  const hydrationAction = actions.find((a) => a.id === 'demo-scenario-hydration');
  assert.ok(hydrationAction, 'Must index hydration scenario action');
  assert.ok(hydrationAction.title.includes('Next.js SSR Hydration Drift'));

  const sqliAction = actions.find((a) => a.id === 'demo-scenario-sqli');
  assert.ok(sqliAction, 'Must index sqli scenario action');
  assert.ok(sqliAction.title.includes('SQL Injection Security Gate'));
});

test('globalCommandIndexer fuzzy search matches "checkout" keyword to demo scenario', () => {
  const searchResults = globalCommandIndexer.search('checkout');
  assert.ok(searchResults.length > 0);
  const found = searchResults.some((r) => r.id === 'demo-scenario-checkout');
  assert.ok(found, 'Search for "checkout" must return demo-scenario-checkout');
});

test('globalCommandIndexer fuzzy search matches "cwe-89" to SQL injection scenario', () => {
  const searchResults = globalCommandIndexer.search('cwe-89');
  assert.ok(searchResults.length > 0);
  const found = searchResults.some((r) => r.id === 'demo-scenario-sqli');
  assert.ok(found, 'Search for "cwe-89" must return demo-scenario-sqli');
});
