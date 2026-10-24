import test from 'node:test';
import assert from 'node:assert/strict';
import { SQL_INJECTION_PREFLIGHT_SCENARIO } from '../src/lib/playground/scenarios/sql-injection-preflight.ts';

test('SQL_INJECTION_PREFLIGHT_SCENARIO has security_preflight category and critical severity', () => {
  assert.equal(SQL_INJECTION_PREFLIGHT_SCENARIO.id, 'sql_injection_preflight');
  assert.equal(SQL_INJECTION_PREFLIGHT_SCENARIO.category, 'security_preflight');
  assert.equal(SQL_INJECTION_PREFLIGHT_SCENARIO.fault.severity, 'critical');
  assert.ok(SQL_INJECTION_PREFLIGHT_SCENARIO.fault.cveReference?.includes('CWE-89'));
});

test('SQL_INJECTION_PREFLIGHT_SCENARIO defines AST gate failure message', () => {
  const failure = SQL_INJECTION_PREFLIGHT_SCENARIO.fault.expectedFailure;
  assert.equal(failure.category, 'security');
  assert.ok(failure.errorMessage.includes('CRITICAL_SECURITY_POLICY_VIOLATION'));
});

test('SQL_INJECTION_PREFLIGHT_SCENARIO patch replaces template literal with parameterized query $1', () => {
  const patch = SQL_INJECTION_PREFLIGHT_SCENARIO.fixProposal.patchDiff;
  assert.ok(patch.includes('$1'));
  assert.ok(patch.includes('SELECT id, username, email'));
  assert.ok(patch.includes('db.query(query, [q])'));
});

test('SQL_INJECTION_PREFLIGHT_SCENARIO preloaded run blocks runtime execution on security failure', () => {
  const tests = SQL_INJECTION_PREFLIGHT_SCENARIO.initialTestResults;
  const blocked = tests.find((t) => t.status === 'blocked');
  assert.ok(blocked, 'Runtime test step should be blocked');
});
