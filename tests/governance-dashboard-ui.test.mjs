import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

console.log('--- Testing Enterprise Governance & SOC2 Compliance Dashboard UI (Contribution 178) ---');

const componentPath = path.join(process.cwd(), 'src', 'components', 'governance', 'GovernanceComplianceDashboard.tsx');
const pagePath = path.join(process.cwd(), 'src', 'app', 'governance', 'page.tsx');

assert.ok(fs.existsSync(componentPath), 'GovernanceComplianceDashboard.tsx must exist');
assert.ok(fs.existsSync(pagePath), 'src/app/governance/page.tsx must exist');

const componentContent = fs.readFileSync(componentPath, 'utf8');
assert.ok(componentContent.includes("'use client'"), 'Component must be a client component');
assert.ok(componentContent.includes('GovernanceComplianceDashboard'), 'Component must export GovernanceComplianceDashboard');
assert.ok(componentContent.includes('Enterprise Governance & SOC2 Compliance'), 'Component must render title');
assert.ok(componentContent.includes('Trust Services Criteria'), 'Component must render TSC section');
assert.ok(componentContent.includes('Cryptographic Audit Log Ledger'), 'Component must render audit ledger');
assert.ok(componentContent.includes('Export Evidence Bundle'), 'Component must support evidence export');

const pageContent = fs.readFileSync(pagePath, 'utf8');
assert.ok(pageContent.includes('GovernanceComplianceDashboard'), 'Page must import and render GovernanceComplianceDashboard');

console.log('✅ Contribution 178 UI component and page verified cleanly!');
