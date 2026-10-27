import assert from 'node:assert/strict';
import { determineActionExitCode } from '../src/action/exit-codes.ts';

console.log('Testing Turnkey Action Runner with Broken Route 404 Violation...');

// When 0 assertions crash but a dead navigation link returned HTTP 404,
// the hard check-run gate must force exit code 1 to block PR merges!
const exitCode = determineActionExitCode({
  status: 'passed',
  failedChecks: 0,
  failOnRegression: true,
  hasBrokenRouteViolation: true,
});

assert.equal(exitCode, 1, 'Broken 404 route must block PR merge with exit code 1');

// When broken route violation is absent, passes with exit code 0
const cleanCode = determineActionExitCode({
  status: 'passed',
  failedChecks: 0,
  failOnRegression: true,
  hasBrokenRouteViolation: false,
});

assert.equal(cleanCode, 0, 'Clean navigation must produce exit code 0');

console.log('✅ Turnkey Action Broken Route Exit tests passed!');
