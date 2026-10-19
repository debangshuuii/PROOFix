import assert from 'assert';
import {
  isTransientError,
  retryOperation,
  withTimeout,
} from '../src/action/retry-handler.ts';

console.log('--- TEST: Timeouts, Bounded Retries & Error Classification ---');

// Test 1: Error classification (transient vs permanent)
console.log('[TEST 1] Error classification logic');
assert.strictEqual(isTransientError({ code: 'ECONNREFUSED' }), true);
assert.strictEqual(isTransientError({ status: 503 }), true);
assert.strictEqual(isTransientError({ status: 429 }), true);

// Permanent errors must not be transient
assert.strictEqual(isTransientError({ status: 401 }), false);
assert.strictEqual(isTransientError({ status: 404 }), false);
assert.strictEqual(isTransientError(new Error('Invalid schema configuration')), false);
console.log('  -> Transient and permanent errors differentiated correctly.');

// Test 2: Transient error recovers on second attempt
console.log('[TEST 2] Transient error retry recovery');
let attempts2 = 0;
const result2 = await retryOperation(
  async (attempt) => {
    attempts2 = attempt;
    if (attempt === 1) {
      const err = new Error('Connection refused');
      err.code = 'ECONNREFUSED';
      throw err;
    }
    return 'recovered_payload';
  },
  { maxRetries: 3, initialDelayMs: 20 }
);

assert.strictEqual(attempts2, 2);
assert.strictEqual(result2, 'recovered_payload');
console.log('  -> Operation recovered on attempt 2 after transient failure.');

// Test 3: Permanent error fails immediately without retrying
console.log('[TEST 3] Permanent error fails immediately on attempt 1');
let attempts3 = 0;
await assert.rejects(
  async () => {
    await retryOperation(
      async (attempt) => {
        attempts3 = attempt;
        const err = new Error('Unauthorized');
        err.status = 401;
        throw err;
      },
      { maxRetries: 3, initialDelayMs: 20 }
    );
  },
  /Unauthorized/,
  'Must throw immediately'
);
assert.strictEqual(attempts3, 1, 'Permanent error must NOT be retried');
console.log('  -> Permanent 401 error failed immediately on attempt 1.');

// Test 4: Bounded retries limit loop
console.log('[TEST 4] Bounded retries terminate at maxRetries limit');
let attempts4 = 0;
await assert.rejects(
  async () => {
    await retryOperation(
      async (attempt) => {
        attempts4 = attempt;
        const err = new Error('Socket timeout');
        err.code = 'ETIMEDOUT';
        throw err;
      },
      { maxRetries: 2, initialDelayMs: 20 }
    );
  },
  /Socket timeout/
);
// Initial attempt + 2 retries = exactly 3 attempts
assert.strictEqual(attempts4, 3, 'Must stop exactly at maxRetries + 1');
console.log('  -> Terminated cleanly after 3 bounded attempts without infinite loop.');

// Test 5: Timeout enforcement
console.log('[TEST 5] Operation timeout enforcement');
await assert.rejects(
  async () => {
    await withTimeout(
      new Promise((r) => setTimeout(r, 200)),
      50,
      'TestOperation'
    );
  },
  /Timeout: TestOperation exceeded maximum execution limit/,
  'Must timeout when limit exceeded'
);
console.log('  -> Timeout triggered promptly when operation exceeded threshold.');

console.log('\n--- All Contribution 28 Retry & Timeout Tests Passed! ---');
