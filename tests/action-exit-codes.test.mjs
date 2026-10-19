import assert from 'assert';
import {
  determineActionExitCode,
  describeExitCode,
  EXIT_SUCCESS,
  EXIT_VERIFICATION_FAILURE,
  EXIT_EXECUTION_ERROR,
} from '../src/action/exit-codes.ts';

console.log('--- TEST: Verification Results to Exit Codes Mapping ---');

// Test 1: All checks passed yields EXIT_SUCCESS (0)
console.log('[TEST 1] Clean passing checks -> Exit Code 0');
const codePassed = determineActionExitCode({
  status: 'passed',
  failedChecks: 0,
  failOnRegression: true,
});
assert.strictEqual(codePassed, EXIT_SUCCESS);
assert.strictEqual(describeExitCode(codePassed).name, 'SUCCESS');
console.log('  -> Passed verification produced Exit Code 0.');

// Test 2: Failed checks yield EXIT_VERIFICATION_FAILURE (1)
console.log('[TEST 2] Failed checks -> Exit Code 1');
const codeFailed = determineActionExitCode({
  status: 'failed',
  failedChecks: 2,
  failOnRegression: true,
});
assert.strictEqual(codeFailed, EXIT_VERIFICATION_FAILURE);
assert.strictEqual(describeExitCode(codeFailed).name, 'VERIFICATION_FAILURE');
console.log('  -> Failed checks produced Exit Code 1.');

// Test 3: INVARIANT VERIFICATION: Failed checks can NEVER accidentally yield 0
console.log('[TEST 3] Invariant: Failed checks cannot accidentally produce exit status 0');
for (let failedCount = 1; failedCount <= 25; failedCount++) {
  const result = determineActionExitCode({
    status: 'failed',
    failedChecks: failedCount,
    failOnRegression: true,
  });
  assert.notStrictEqual(
    result,
    0,
    `FAILED INVARIANT: ${failedCount} failing checks must never return exit code 0`
  );
  assert.strictEqual(result, 1);
}
console.log('  -> Invariant confirmed across 25 failing configurations: 0 was NEVER returned.');

// Test 4: Execution error yields EXIT_EXECUTION_ERROR (2)
console.log('[TEST 4] Execution error -> Exit Code 2');
const codeError = determineActionExitCode({
  status: 'error',
  failedChecks: 0,
  failOnRegression: true,
  hasExecutionError: true,
});
assert.strictEqual(codeError, EXIT_EXECUTION_ERROR);
assert.strictEqual(describeExitCode(codeError).name, 'EXECUTION_ERROR');
console.log('  -> Execution error produced Exit Code 2.');

// Test 5: Advisory mode (failOnRegression = false)
console.log('[TEST 5] Advisory mode (failOnRegression = false)');
const codeAdvisory = determineActionExitCode({
  status: 'failed',
  failedChecks: 3,
  failOnRegression: false,
});
assert.strictEqual(codeAdvisory, EXIT_SUCCESS, 'Advisory mode allows 0 for warnings');

// Even in advisory mode, execution errors MUST still return 2
const codeAdvisoryError = determineActionExitCode({
  status: 'error',
  failedChecks: 0,
  failOnRegression: false,
  hasExecutionError: true,
});
assert.strictEqual(codeAdvisoryError, EXIT_EXECUTION_ERROR, 'Errors must always abort');
console.log('  -> Advisory mode properly maps warnings to 0 and fatal errors to 2.');

console.log('\n--- All Contribution 24 Exit Code Mapping Tests Passed! ---');
