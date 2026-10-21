import assert from 'node:assert/strict';
import { DomMutationTracker } from '../src/lib/companion/dom-mutation-tracker.ts';
import { TelemetryBroadcaster } from '../src/lib/companion/telemetry-broadcaster.ts';

console.log('--- Testing DOM Mutation Tracker & Noise Filtering Engine (Contribution 126) ---');

function testNoiseFiltering() {
  const tracker = new DomMutationTracker('run_dom_01');

  // 1. Framework noise: data-reactroot attribute change
  const reactNoise = {
    type: 'attributes',
    targetSelector: 'div#root',
    attributeName: 'data-reactroot',
    oldValue: '',
    newValue: 'true',
    timestamp: new Date().toISOString(),
  };
  assert.equal(tracker.isMeaningfulMutation(reactNoise), false);

  // 2. Script element noise
  const scriptNoise = {
    type: 'childList',
    targetSelector: 'script#analytics',
    addedNodesCount: 1,
    timestamp: new Date().toISOString(),
  };
  assert.equal(tracker.isMeaningfulMutation(scriptNoise), false);

  // 3. Meaningful UI mutation: Modal open / button disabled
  const modalOpen = {
    type: 'childList',
    targetSelector: 'div.modal-container',
    addedNodesCount: 3,
    removedNodesCount: 0,
    timestamp: new Date().toISOString(),
  };
  assert.equal(tracker.isMeaningfulMutation(modalOpen), true);

  const buttonDisabled = {
    type: 'attributes',
    targetSelector: 'button#submit-order',
    attributeName: 'disabled',
    oldValue: undefined,
    newValue: 'true',
    timestamp: new Date().toISOString(),
  };
  assert.equal(tracker.isMeaningfulMutation(buttonDisabled), true);
  console.log('[PASS] DOM mutation noise filters suppress React/script noise and capture true UI mutations.');
}

function testStepRecordingAndSummary() {
  const broadcaster = new TelemetryBroadcaster();
  const tracker = new DomMutationTracker('run_dom_02', {}, broadcaster);

  const rawBatch = [
    {
      type: 'childList',
      targetSelector: 'div.cart-items',
      addedNodesCount: 2,
      removedNodesCount: 0,
      timestamp: new Date().toISOString(),
    },
    {
      type: 'attributes',
      targetSelector: 'button#checkout',
      attributeName: 'disabled',
      oldValue: 'true',
      newValue: 'false',
      timestamp: new Date().toISOString(),
    },
    {
      type: 'attributes',
      targetSelector: 'head > style',
      attributeName: 'data-href',
      timestamp: new Date().toISOString(),
    }, // Should be filtered
  ];

  const recorded = tracker.recordMutations(1, rawBatch);
  assert.equal(recorded.length, 2, 'Must record exactly the 2 meaningful mutations');

  const stepList = tracker.getStepMutations(1);
  assert.equal(stepList.length, 2);

  const summary = tracker.summarizeStepActivity(1);
  assert.ok(summary.includes('+2 elements added'));
  assert.ok(summary.includes('button#checkout[disabled]'));
  console.log('[PASS] Step mutation batches recorded and summarized into human-readable diagnostics.');
}

function testInjectionScriptGeneration() {
  const script = DomMutationTracker.getInjectionScript();
  assert.ok(script.includes('MutationObserver'));
  assert.ok(script.includes('__proofixMutations'));
  assert.ok(script.includes('observer.observe'));
  console.log('[PASS] Browser-side MutationObserver script generated for Playwright injection.');
}

testNoiseFiltering();
testStepRecordingAndSummary();
testInjectionScriptGeneration();
console.log('\nAll Contribution 126 tests passed cleanly!');
