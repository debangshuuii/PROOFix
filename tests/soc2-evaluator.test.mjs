import assert from 'node:assert/strict';
import { CryptographicAuditLedger } from '../src/lib/governance/audit-ledger.ts';
import { RbacPolicyEngine } from '../src/lib/governance/rbac-engine.ts';
import { Soc2ComplianceEvaluator } from '../src/lib/governance/soc2-evaluator.ts';

console.log('--- Testing SOC2 Trust Services Criteria Evaluator (Contribution 174) ---');

const ledger = new CryptographicAuditLedger();
ledger.append({
  actorId: 'usr-admin-1',
  actorRole: 'super_admin',
  tenantId: 'tenant-enterprise',
  action: 'system:initialized',
  resourceType: 'platform',
  resourceId: 'node-01',
});

const rbac = new RbacPolicyEngine();
const evaluator = new Soc2ComplianceEvaluator(ledger, rbac);

// 1. Clean Compliance Scan
const report = await evaluator.evaluateCompliance();
assert.ok(report.reportId.startsWith('soc2_'));
assert.equal(report.status, 'compliant');
assert.ok(report.overallScore >= 95, `Expected score >= 95%, got ${report.overallScore}%`);
assert.equal(report.totalControls, 6);
assert.equal(report.compliantControls, 6);
assert.equal(report.tamperProofChainVerified, true);
console.log(`✅ Automated SOC2 scan passed with ${report.overallScore}% overall score`);

// 2. Test Control Gaps Detection (Tampered Ledger)
ledger._simulateTampering(1, 'system:tampered_action');
const tamperedReport = await evaluator.evaluateCompliance();
assert.equal(tamperedReport.status, 'non_compliant', 'Tampered ledger must trigger non-compliant status');
assert.equal(tamperedReport.tamperProofChainVerified, false);
const ledgerFinding = tamperedReport.findings.find((f) => f.name.includes('Tamper-Evident SHA-256 Audit Ledger'));
assert.ok(ledgerFinding);
assert.equal(ledgerFinding.status, 'non_compliant');
console.log('✅ Audit ledger tampering correctly drops SOC2 compliance status to non_compliant');

console.log('✅ Contribution 174 tests passed cleanly!');
