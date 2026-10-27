import assert from 'node:assert/strict';
import { determineActionExitCode } from '../src/action/exit-codes.ts';

console.log('Testing Turnkey Action Runner with Hydration Violation...');

// When all tests technically pass (0 test failures) but a React 19 hydration mismatch was detected,
// the hard gate must force exit code 1 to block PR merges!
const exitCode = determineActionExitCode({
  status: 'passed',
  failedChecks: 0,
  failOnRegression: true,
  hasHydrationViolation: true,
});

assert.equal(exitCode, 1, 'Hydration drift must block PR merge with exit code 1');

// When hydration drift is not present, clean exit code 0
const cleanCode = determineActionExitCode({
  status: 'passed',
  failedChecks: 0,
  failOnRegression: true,
  hasHydrationViolation: false,
});

assert.equal(cleanCode, 0, 'Clean run must produce exit code 0');

console.log('✅ Turnkey Action Hydration Exit tests passed!');
