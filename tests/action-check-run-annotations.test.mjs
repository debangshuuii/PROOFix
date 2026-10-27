import assert from 'node:assert/strict';
import { formatCheckRunAnnotations } from '../src/action/check-run-gatekeeper.ts';

console.log('Testing Line-Level Check Run Annotations Synthesizer...');

const failures = [
  {
    testId: 'test_api_checkout',
    route: '/api/checkout',
    status: 'failed',
    error: 'HTTP 500: Database connection refused',
  },
  {
    testId: 'test_home_render',
    route: '/',
    status: 'passed',
  },
  {
    testId: 'test_product_page',
    route: '/products/widget',
    status: 'failed',
    error: 'Element <button id="add-to-cart"> timed out after 5000ms',
  },
];

const annotations = formatCheckRunAnnotations(failures);

assert.equal(annotations.length, 2, 'Only failed tests should produce annotations');

// API Route path mapping
assert.equal(annotations[0].path, 'src/app/api/checkout/route.ts');
assert.equal(annotations[0].annotation_level, 'failure');
assert.ok(annotations[0].message.includes('Database connection refused'));

// Page route path mapping
assert.equal(annotations[1].path, 'src/app/products/widget/page.tsx');
assert.equal(annotations[1].annotation_level, 'failure');
assert.ok(annotations[1].message.includes('Element <button id="add-to-cart"> timed out'));

console.log('✅ Line-Level Check Run Annotations Synthesizer tests passed!');
