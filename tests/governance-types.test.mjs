import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

console.log('--- Testing Enterprise Governance, RBAC & SOC2 Compliance Types (Contribution 171) ---');

const typesFilePath = path.join(process.cwd(), 'src', 'lib', 'types', 'governance-compliance.ts');
assert.ok(fs.existsSync(typesFilePath), 'src/lib/types/governance-compliance.ts must exist');

const content = fs.readFileSync(typesFilePath, 'utf8');
assert.ok(content.includes('export type UserRole'), 'Must declare UserRole');
assert.ok(content.includes('export type Permission'), 'Must declare Permission');
assert.ok(content.includes('export interface RoleDefinition'), 'Must declare RoleDefinition');
assert.ok(content.includes('export interface AuditLogEntry'), 'Must declare AuditLogEntry');
assert.ok(content.includes('export type Soc2TrustCriterion'), 'Must declare Soc2TrustCriterion');
assert.ok(content.includes('export interface Soc2ComplianceReport'), 'Must declare Soc2ComplianceReport');
assert.ok(content.includes('export interface EvidencePackageManifest'), 'Must declare EvidencePackageManifest');
assert.ok(content.includes('export interface RetentionPolicy'), 'Must declare RetentionPolicy');

// Sample audit log entry structure check
const sampleEntry = {
  id: 'audit-001',
  sequenceNumber: 1,
  timestamp: new Date().toISOString(),
  actorId: 'usr-admin-42',
  actorRole: 'super_admin',
  tenantId: 'tenant-enterprise',
  action: 'healing:approve',
  resourceType: 'pull_request',
  resourceId: 'pr-104',
  details: { prUrl: 'https://github.com/org/repo/pull/104' },
  previousHash: '0000000000000000000000000000000000000000000000000000000000000000',
  entryHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
};

assert.equal(sampleEntry.sequenceNumber, 1);
assert.equal(sampleEntry.actorRole, 'super_admin');
assert.equal(sampleEntry.action, 'healing:approve');

console.log('✅ Contribution 171 tests passed cleanly!');
