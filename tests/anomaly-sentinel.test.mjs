import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AnomalySentinel,
  globalAnomalySentinel,
} from '../src/lib/crawler/anomaly-sentinel.ts';

test('recordException captures critical runtime errors', () => {
  const sentinel = new AnomalySentinel();
  const anom = sentinel.recordException(
    'Uncaught TypeError: window.dataLayer is undefined',
    'at https://acme.com/analytics.js:42',
    'https://acme.com/checkout'
  );

  assert.equal(anom.type, 'uncaught_exception');
  assert.equal(anom.severity, 'critical');
  assert.ok(anom.message.includes('dataLayer is undefined'));
  assert.equal(sentinel.hasCriticalAnomalies(), true);
});

test('recordHttpFailure categorizes 500 as critical and 404 as medium', () => {
  const sentinel = new AnomalySentinel();

  const anom500 = sentinel.recordHttpFailure(500, 'https://acme.com/api/pay');
  assert.ok(anom500);
  assert.equal(anom500.type, 'http_server_error');
  assert.equal(anom500.severity, 'critical');

  const anom404 = sentinel.recordHttpFailure(404, 'https://acme.com/broken-doc');
  assert.ok(anom404);
  assert.equal(anom404.type, 'broken_link_404');
  assert.equal(anom404.severity, 'medium');

  // 200 is not an anomaly
  assert.equal(sentinel.recordHttpFailure(200, 'https://acme.com/ok'), null);
});

test('recordLayoutOverflow flags horizontal overflow when scrollWidth > innerWidth', () => {
  const sentinel = new AnomalySentinel();

  const overflow = sentinel.recordLayoutOverflow(1400, 1280, 'https://acme.com/pricing');
  assert.ok(overflow);
  assert.equal(overflow.type, 'layout_overflow');
  assert.equal(overflow.severity, 'high');
  assert.ok(overflow.message.includes('by 120px'));

  // Normal width within tolerance is not an anomaly
  assert.equal(sentinel.recordLayoutOverflow(1281, 1280, 'https://acme.com/home'), null);
});
