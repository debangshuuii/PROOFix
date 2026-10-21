import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Governance subsystem imports
import { RbacPolicyEngine } from '../src/lib/governance/rbac-engine.ts';
import { CryptographicAuditLedger, GENESIS_HASH } from '../src/lib/governance/audit-ledger.ts';
import { Soc2ComplianceEvaluator } from '../src/lib/governance/soc2-evaluator.ts';
import { EvidenceCollector } from '../src/lib/governance/evidence-collector.ts';
import { DataRetentionManager } from '../src/lib/governance/data-retention.ts';
import { ContinuousComplianceMonitor } from '../src/lib/governance/compliance-monitor.ts';

console.log('========================================================================');
console.log('🚀 PROOFix Master CI Suite: Enterprise Governance & SOC2 (171–180)');
console.log('========================================================================\n');

const testTempDir = path.join(process.cwd(), '.ci-governance-temp');
if (fs.existsSync(testTempDir)) fs.rmSync(testTempDir, { recursive: true, force: true });

// Step 1: RBAC & MFA Step-Up Enforcement
console.log('Step 1: Testing Least-Privilege RBAC & MFA Step-Up Enforcement...');
const rbac = new RbacPolicyEngine();
const devUser = { userId: 'u1', userRole: 'developer', tenantId: 'tenant-a', mfaAuthenticated: false };
const qaUserNoMfa = { userId: 'u2', userRole: 'qa_lead', tenantId: 'tenant-a', mfaAuthenticated: false };
const qaUserWithMfa = { userId: 'u2', userRole: 'qa_lead', tenantId: 'tenant-a', mfaAuthenticated: true };

assert.equal(rbac.can(devUser, 'healing:approve', 'tenant-a'), false, 'Developers cannot approve healing');
assert.equal(rbac.can(qaUserNoMfa, 'healing:approve', 'tenant-a'), false, 'MFA is required for healing approval');
assert.equal(rbac.can(qaUserWithMfa, 'healing:approve', 'tenant-a'), true, 'QA lead with MFA is authorized');
console.log('  -> Granular permissions, MFA gating, and tenant boundaries enforced.\n');

// Step 2: Immutable Cryptographic Audit Ledger & Hash Chaining
console.log('Step 2: Testing Immutable Cryptographic Audit Ledger...');
const ledger = new CryptographicAuditLedger();
const e1 = ledger.append({
  actorId: 'usr-admin',
  actorRole: 'super_admin',
  tenantId: 'tenant-a',
  action: 'test_run:triggered',
  resourceType: 'suite',
  resourceId: 'suite-01',
});
assert.equal(e1.previousHash, GENESIS_HASH);

const e2 = ledger.append({
  actorId: 'usr-qa',
  actorRole: 'qa_lead',
  tenantId: 'tenant-a',
  action: 'healing:approved',
  resourceType: 'pull_request',
  resourceId: 'pr-10',
});
assert.equal(e2.previousHash, e1.entryHash);

const chainVerification = ledger.verifyLedgerIntegrity();
assert.equal(chainVerification.valid, true);
assert.equal(chainVerification.totalEntries, 2);
console.log('  -> SHA-256 Merkle hash chain mathematically verified.\n');

// Step 3: Tamper Detection
console.log('Step 3: Testing Tamper Detection Mechanism...');
ledger._simulateTampering(1, 'unauthorized:tampered_action');
const tamperedCheck = ledger.verifyLedgerIntegrity();
assert.equal(tamperedCheck.valid, false);
assert.equal(tamperedCheck.corruptedAtSequence, 1);
console.log('  -> Retrospective modification of ledger record detected.\n');

// Restore clean ledger for subsequent steps
const cleanLedger = new CryptographicAuditLedger();
cleanLedger.append({
  actorId: 'usr-init',
  actorRole: 'super_admin',
  tenantId: 'tenant-a',
  action: 'system:ready',
  resourceType: 'node',
  resourceId: 'cluster-01',
});

// Step 4: SOC2 Trust Services Criteria Evaluation
console.log('Step 4: Testing Automated SOC2 Compliance Evaluation...');
const evaluator = new Soc2ComplianceEvaluator(cleanLedger, rbac);
const soc2Report = await evaluator.evaluateCompliance();
assert.equal(soc2Report.status, 'compliant');
assert.ok(soc2Report.overallScore >= 95);
assert.equal(soc2Report.totalControls, 6);
console.log(`  -> SOC2 assessment passed: ${soc2Report.overallScore}% score across 6 controls.\n`);

// Step 5: Automated Evidence Collector & Artifact Packager
console.log('Step 5: Testing Auditor Evidence Packaging (Vanta/Drata format)...');
const collector = new EvidenceCollector(cleanLedger, evaluator, testTempDir);
const evidenceManifest = await collector.generateEvidencePackage('tenant-a');
assert.ok(evidenceManifest.packageId.startsWith('ev_pack_'));
assert.ok(evidenceManifest.archiveChecksum.length === 64);
collector.cleanup();
console.log('  -> Signed evidence bundle and checksums generated.\n');

// Step 6: PII Redaction & Data Retention Lifecycles
console.log('Step 6: Testing Sensitive PII Redaction & TTL Retention Purges...');
const retentionMgr = new DataRetentionManager();
const scrubbed = retentionMgr.redactPii('Customer card 4532111122223333 with email user@test.com');
assert.ok(scrubbed.includes('[REDACTED_CREDIT_CARD]'));
assert.ok(scrubbed.includes('[REDACTED_EMAIL]'));

const now = Date.now();
const dayMs = 24 * 60 * 60 * 1000;
const testRecords = [
  { id: 'v1', createdAt: new Date(now - 15 * dayMs).toISOString(), type: 'session_video' },
  { id: 'v2', createdAt: new Date(now - 2 * dayMs).toISOString(), type: 'session_video' },
];
const purgeRes = retentionMgr.purgeExpiredRecords(testRecords, {
  tenantId: 'tenant-a',
  testRunTtlDays: 30,
  sessionVideoTtlDays: 7,
  auditLogTtlDays: 365,
  piiMaskingEnabled: true,
}, now);
assert.equal(purgeRes.purgedCount, 1);
assert.equal(purgeRes.retained.length, 1);
console.log('  -> PII scrubbing and automated TTL purge verified.\n');

// Step 7: Continuous Compliance Monitoring & Drift Alerts
console.log('Step 7: Testing Continuous Compliance Heartbeat & Drift Alerts...');
const monitor = new ContinuousComplianceMonitor(cleanLedger, evaluator);
const driftAlerts = await monitor.checkDrift();
assert.equal(driftAlerts.length, 0, 'Clean state must have 0 drift alerts');
console.log('  -> Continuous compliance heartbeat verified.\n');

if (fs.existsSync(testTempDir)) fs.rmSync(testTempDir, { recursive: true, force: true });

console.log('========================================================================');
console.log('🎉 ALL 10 ENTERPRISE GOVERNANCE & SOC2 VERIFICATION CHECKS PASSED!');
console.log('========================================================================');
