import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import AdmZip from 'adm-zip';
import { CryptographicAuditLedger } from '../src/lib/governance/audit-ledger.ts';
import { Soc2ComplianceEvaluator } from '../src/lib/governance/soc2-evaluator.ts';
import { EvidenceCollector } from '../src/lib/governance/evidence-collector.ts';

console.log('--- Testing Automated Evidence Collector & Artifact Packager (Contribution 175) ---');

const testEvidenceDir = path.join(process.cwd(), '.test-evidence-packager-temp');
if (fs.existsSync(testEvidenceDir)) fs.rmSync(testEvidenceDir, { recursive: true, force: true });

const ledger = new CryptographicAuditLedger();
ledger.append({
  actorId: 'usr-security-officer',
  actorRole: 'security_auditor',
  tenantId: 'tenant-enterprise',
  action: 'compliance:scan_initiated',
  resourceType: 'system',
  resourceId: 'node-audit',
});

const evaluator = new Soc2ComplianceEvaluator(ledger);
const collector = new EvidenceCollector(ledger, evaluator, testEvidenceDir);

// 1. Generate Evidence Package
const manifest = await collector.generateEvidencePackage('tenant-enterprise');
assert.ok(manifest.packageId.startsWith('ev_pack_'));
assert.equal(manifest.tenantId, 'tenant-enterprise');
assert.ok(manifest.archiveChecksum.length === 64, 'Archive checksum must be 64-char SHA-256');
assert.ok(manifest.controlFindingsCount >= 6);

const zipFilePath = path.join(testEvidenceDir, `${manifest.packageId}.zip`);
assert.ok(fs.existsSync(zipFilePath), 'Evidence ZIP file must be written to disk');
console.log('✅ Evidence package bundle generated successfully');

// 2. Validate Contents inside ZIP
const zip = new AdmZip(zipFilePath);
const zipEntries = zip.getEntries().map((e) => e.entryName);

assert.ok(zipEntries.includes('soc2-compliance-report.json'), 'Must contain SOC2 report');
assert.ok(zipEntries.includes('audit-ledger-verified.json'), 'Must contain verified audit ledger');
assert.ok(zipEntries.includes('security-controls-manifest.json'), 'Must contain controls manifest');
assert.ok(zipEntries.includes('checksums.sha256'), 'Must contain checksums file');

const extractedReport = JSON.parse(zip.readAsText('soc2-compliance-report.json'));
assert.equal(extractedReport.status, 'compliant');
assert.ok(extractedReport.overallScore >= 90);
console.log('✅ Archive contents inspected and verified against SOC2 standards');

// 3. Cleanup
collector.cleanup();
assert.equal(fs.existsSync(testEvidenceDir), false);
console.log('✅ Temporary evidence directory cleaned up cleanly');

console.log('✅ Contribution 175 tests passed cleanly!');
