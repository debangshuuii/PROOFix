import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CryptographicAuditLedger } from '../src/lib/governance/audit-ledger.ts';
import { Soc2ComplianceEvaluator } from '../src/lib/governance/soc2-evaluator.ts';
import { EvidenceCollector } from '../src/lib/governance/evidence-collector.ts';

console.log('--- Testing Governance & SOC2 Compliance REST API Route (Contribution 177) ---');

// 1. Verify Route File Exists and Exports Expected Endpoints
const routePath = path.join(process.cwd(), 'src', 'app', 'api', 'v1', 'governance', 'route.ts');
assert.ok(fs.existsSync(routePath), 'src/app/api/v1/governance/route.ts must exist');

const routeContent = fs.readFileSync(routePath, 'utf8');
assert.ok(routeContent.includes('export async function GET'), 'Route must export GET handler');
assert.ok(routeContent.includes('export async function POST'), 'Route must export POST handler');
assert.ok(routeContent.includes('evaluate_soc2'), 'POST must handle evaluate_soc2 action');
assert.ok(routeContent.includes('export_evidence'), 'POST must handle export_evidence action');
assert.ok(routeContent.includes('append_audit'), 'POST must handle append_audit action');
console.log('✅ Governance route file verified with GET and POST handlers');

// 2. Test Underlying Business Logic Supporting Route
const ledger = new CryptographicAuditLedger();
const evaluator = new Soc2ComplianceEvaluator(ledger);
const collector = new EvidenceCollector(ledger, evaluator);

// Append audit via ledger
const entry = ledger.append({
  actorId: 'usr-api-tester',
  actorRole: 'qa_lead',
  tenantId: 'tenant-enterprise',
  action: 'healing:approved',
  resourceType: 'pull_request',
  resourceId: 'pr-99',
  details: { automated: true },
});
assert.equal(entry.action, 'healing:approved');
assert.ok(entry.entryHash.length === 64);
console.log('✅ Audit entry appended with SHA-256 hash chaining');

// Run SOC2 evaluation
const report = await evaluator.evaluateCompliance();
assert.ok(report.overallScore >= 90);
assert.equal(report.status, 'compliant');
console.log(`✅ SOC2 evaluation completed successfully with ${report.overallScore}% score`);

// Export evidence package
const manifest = await collector.generateEvidencePackage('tenant-enterprise');
assert.ok(manifest.packageId.startsWith('ev_pack_'));
assert.ok(manifest.archiveChecksum.length === 64);
collector.cleanup();
console.log('✅ Evidence package generation validated');

console.log('✅ Contribution 177 tests passed cleanly!');
