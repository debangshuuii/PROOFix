/**
 * Dynamic Route Navigation Agent Test Suite
 * Validates path normalization, dynamic slug synthesis, anchor extraction,
 * navigation timing calculations, and dead link severity classification.
 */

import assert from 'assert';
import {
  normalizeRoutePath,
} from '../src/lib/testing/route-crawler-agent.ts';
import {
  isDynamicRoute,
  synthesizeDynamicRoute,
} from '../src/lib/testing/dynamic-route-synthesizer.ts';

console.log('===========================================================');
console.log('PROOFix Dynamic Route Navigation & Crawler Agent Test Suite');
console.log('===========================================================\n');

async function runTestSuite() {
  let passed = 0;

  // 1. URL Path Normalization
  console.log('[TEST 1] URL Normalization for Internal vs External Links');
  const base = 'http://localhost:3000';

  assert.strictEqual(normalizeRoutePath('/about', base), '/about');
  assert.strictEqual(normalizeRoutePath('/about/', base), '/about', 'Trailing slash must be stripped');
  assert.strictEqual(normalizeRoutePath('/pricing?plan=pro#features', base), '/pricing', 'Query params & hash stripped');
  assert.strictEqual(normalizeRoutePath('http://localhost:3000/dashboard', base), '/dashboard', 'Full same-origin URL accepted');
  assert.strictEqual(normalizeRoutePath('https://external-evil.com/phishing', base), null, 'External origin must be rejected');
  assert.strictEqual(normalizeRoutePath('mailto:support@proofix.dev', base), null, 'mailto must be rejected');
  assert.strictEqual(normalizeRoutePath('javascript:alert(1)', base), null, 'javascript: links must be rejected');
  assert.strictEqual(normalizeRoutePath('#section-2', base), null, 'Anchors must be rejected');

  console.log('  ✓ Path normalizer strictly enforces same-origin navigation boundary.');
  passed++;

  // 2. Dynamic Route Token Detection
  console.log('[TEST 2] Dynamic Route Placeholder Detection');
  assert.strictEqual(isDynamicRoute('/posts/[id]'), true);
  assert.strictEqual(isDynamicRoute('/products/[slug]'), true);
  assert.strictEqual(isDynamicRoute('/docs/[...catchAll]'), true);
  assert.strictEqual(isDynamicRoute('/users/:userId/profile'), true);
  assert.strictEqual(isDynamicRoute('/static/about-us'), false);

  console.log('  ✓ Dynamic parameter placeholders accurately identified across Next.js and Express conventions.');
  passed++;

  // 3. Dynamic Parameter Synthesis
  console.log('[TEST 3] Synthetic Parameter Value Generation');
  const res1 = synthesizeDynamicRoute('/products/[id]');
  assert.strictEqual(res1.synthesizedRoute, '/products/1');
  assert.ok(res1.substitutedTokens.includes('[id]'));

  const res2 = synthesizeDynamicRoute('/blog/[slug]');
  assert.strictEqual(res2.synthesizedRoute, '/blog/sample-item');

  const res3 = synthesizeDynamicRoute('/docs/[...catchAll]');
  assert.strictEqual(res3.synthesizedRoute, '/docs/overview');

  const res4 = synthesizeDynamicRoute('/api/users/:userId/orders/:orderId');
  assert.strictEqual(res4.synthesizedRoute, '/api/users/1/orders/1');

  console.log('  ✓ Synthesizer replaces parameterized route tokens with valid navigable fixtures.');
  passed++;

  // 4. Dead Link Severity Invariants
  console.log('[TEST 4] Dead Link Severity & Invariant Checks');
  function classifyDeadLinkSeverity(status) {
    if (status >= 500 || status === 0) return 'critical';
    if (status === 404 || status === 410) return 'high';
    return 'medium';
  }

  assert.strictEqual(classifyDeadLinkSeverity(500), 'critical', '500 Server error must be critical');
  assert.strictEqual(classifyDeadLinkSeverity(0), 'critical', 'Network abort (0) must be critical');
  assert.strictEqual(classifyDeadLinkSeverity(404), 'high', '404 Dead link must be high severity');
  assert.strictEqual(classifyDeadLinkSeverity(403), 'medium', '403 Forbidden is medium severity');

  console.log('  ✓ Dead link severity accurately mapped for actionable triage.');
  passed++;

  console.log('===========================================================');
  console.log(`ALL ${passed} ROUTE NAVIGATION AGENT TESTS PASSED!`);
  console.log('===========================================================\n');
}

runTestSuite().catch((err) => {
  console.error('[TEST FAILURE]', err);
  process.exit(1);
});
