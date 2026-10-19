import assert from 'node:assert/strict';
import {
  evaluateSecurityGate,
  validateSecurityGatePolicy,
  DEFAULT_SECURITY_GATE_POLICY,
} from '../src/lib/security/security-gate.ts';

console.log('--- Testing Configurable Security Gate Policies (Contribution 78) ---');

function createSampleFinding(severity, id = 'GHSA-test') {
  return {
    id: `vuln_${id}`,
    advisoryId: id,
    aliases: [],
    packageName: 'test-lib',
    packageVersion: '1.0.0',
    ecosystem: 'npm',
    dependencyType: 'direct',
    severity,
    summary: 'Sample advisory',
    source: 'osv',
    patchedVersions: ['1.0.1'],
    remediationGuidance: 'Upgrade to 1.0.1',
    scannedAt: new Date().toISOString(),
  };
}

function testDefaultGatePolicy() {
  const defaultPolicy = validateSecurityGatePolicy();
  assert.equal(defaultPolicy.blockOnVulnerabilitySeverity, 'critical');
  assert.equal(defaultPolicy.blockOnSecrets, true);
  assert.equal(defaultPolicy.allowIncompleteScans, false);

  // Medium vulnerability does NOT block under critical threshold
  const mediumResult = evaluateSecurityGate(defaultPolicy, {
    vulnerabilities: [createSampleFinding('medium')],
    secrets: [],
  });
  assert.equal(mediumResult.blocked, false);
  assert.equal(mediumResult.action, 'warn');
  assert.equal(mediumResult.blockingVulnerabilitiesCount, 0);

  // Critical vulnerability DOES block
  const criticalResult = evaluateSecurityGate(defaultPolicy, {
    vulnerabilities: [createSampleFinding('critical')],
    secrets: [],
  });
  assert.equal(criticalResult.blocked, true);
  assert.equal(criticalResult.action, 'block');
  assert.equal(criticalResult.blockingVulnerabilitiesCount, 1);

  // Secret finding DOES block
  const secretResult = evaluateSecurityGate(defaultPolicy, {
    vulnerabilities: [],
    secrets: [
      {
        id: 'sec_1',
        detectorType: 'AWS Access Key ID',
        filePath: 'keys.env',
        lineNumber: 1,
        redactedExcerpt: 'AKIA****',
        mask: 'AKIA****',
        confidence: 'high',
        severity: 'critical',
      },
    ],
  });
  assert.equal(secretResult.blocked, true);
  assert.equal(secretResult.action, 'block');
  assert.equal(secretResult.blockingSecretsCount, 1);

  console.log('[PASS] Default gate policy correctly allows warnings for lower severities while blocking on critical findings and secrets.');
}

function testCustomThresholds() {
  const highPolicy = validateSecurityGatePolicy({
    blockOnVulnerabilitySeverity: 'high',
    blockOnSecrets: false,
  });

  const highResult = evaluateSecurityGate(highPolicy, {
    vulnerabilities: [createSampleFinding('high')],
    secrets: [],
  });
  assert.equal(highResult.blocked, true);
  assert.equal(highResult.action, 'block');

  const warnSecretResult = evaluateSecurityGate(highPolicy, {
    vulnerabilities: [],
    secrets: [
      {
        id: 'sec_2',
        detectorType: 'Google API Key',
        filePath: 'app.env',
        lineNumber: 2,
        redactedExcerpt: 'AIza****',
        mask: 'AIza****',
        confidence: 'high',
        severity: 'high',
      },
    ],
  });
  assert.equal(warnSecretResult.blocked, false, 'Non-blocking secret policy should not block');
  assert.equal(warnSecretResult.action, 'warn');

  console.log('[PASS] Custom severity thresholds and non-blocking secret policies respected.');
}

function testIncompleteScanSafety() {
  const strictPolicy = validateSecurityGatePolicy({
    allowIncompleteScans: false,
  });

  // Scanner encountered errors and could not verify packages
  const incompleteResult = evaluateSecurityGate(strictPolicy, {
    vulnerabilities: [],
    secrets: [],
    scanErrors: ['Connection to OSV timed out', 'Lockfile corrupted'],
    uncheckableCount: 5,
  });

  // "Done when: policy behavior is deterministic and incomplete scans are not falsely reported as clean."
  assert.equal(incompleteResult.isIncomplete, true);
  assert.equal(incompleteResult.blocked, true, 'Incomplete scans with scanner errors must not be reported as clean');
  assert.equal(incompleteResult.action, 'block');
  assert.ok(incompleteResult.reasons.some((r) => r.includes('scanner error(s)')));
  assert.ok(incompleteResult.reasons.some((r) => r.includes('could not be verified')));

  console.log('[PASS] Incomplete scans with errors are strictly prevented from falsely passing as clean.');
}

function testGateDeterminism() {
  const policy = validateSecurityGatePolicy({ blockOnVulnerabilitySeverity: 'medium' });
  const input = {
    vulnerabilities: [createSampleFinding('medium', 'GHSA-fixed-01')],
    secrets: [],
    uncheckableCount: 1,
  };

  const first = evaluateSecurityGate(policy, input);

  for (let i = 0; i < 50; i++) {
    const next = evaluateSecurityGate(policy, input);
    assert.equal(next.blocked, first.blocked);
    assert.equal(next.action, first.action);
    assert.equal(next.blockingVulnerabilitiesCount, first.blockingVulnerabilitiesCount);
    assert.equal(next.isIncomplete, first.isIncomplete);
  }

  console.log('[PASS] Security gate evaluation verified 100% deterministic across 50 iterations.');
}

testDefaultGatePolicy();
testCustomThresholds();
testIncompleteScanSafety();
testGateDeterminism();

console.log('[ALL PASS] Contribution 78 test suite passed.');
