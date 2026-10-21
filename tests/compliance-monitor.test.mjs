import assert from 'node:assert/strict';
import { CryptographicAuditLedger } from '../src/lib/governance/audit-ledger.ts';
import { Soc2ComplianceEvaluator } from '../src/lib/governance/soc2-evaluator.ts';
import { ContinuousComplianceMonitor } from '../src/lib/governance/compliance-monitor.ts';

console.log('--- Testing Continuous Compliance Monitoring & Drift Alerting (Contribution 179) ---');

const ledger = new CryptographicAuditLedger();
ledger.append({
  actorId: 'usr-admin-1',
  actorRole: 'super_admin',
  tenantId: 'tenant-enterprise',
  action: 'platform:ready',
  resourceType: 'system',
  resourceId: 'node-01',
});

const evaluator = new Soc2ComplianceEvaluator(ledger);
const monitor = new ContinuousComplianceMonitor(ledger, evaluator);

// 1. Clean Check
const initialAlerts = await monitor.checkDrift();
assert.equal(initialAlerts.length, 0, 'Clean compliant system should generate 0 drift alerts');
console.log('✅ Baseline compliance verified: 0 configuration drift alerts');

// 2. Tampering & Drift Detection
const receivedAlerts = [];
monitor.onAlert((alert) => {
  receivedAlerts.push(alert);
});

// Simulate tampering in ledger
ledger._simulateTampering(1, 'platform:unauthorized_modification');

const driftAlerts = await monitor.checkDrift();
assert.ok(driftAlerts.length >= 1, 'Tampered ledger must trigger drift alerts');
assert.equal(driftAlerts[0].severity, 'critical');
assert.equal(receivedAlerts.length, driftAlerts.length);
console.log('✅ Critical drift alert emitted and received by alert subscriber');

// 3. Verify Drift Logged into Ledger
const entries = ledger.getEntries('system');
assert.ok(entries.some((e) => e.action === 'compliance:drift_detected'));
console.log('✅ Compliance drift incident automatically recorded into audit trail');

console.log('✅ Contribution 179 tests passed cleanly!');
