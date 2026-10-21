import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ENTERPRISE_PORTAL_METADATA } from '../src/lib/navigation/portal-registry.ts';

console.log('--- Testing Enterprise Portal Hub Launchpad Component (Contribution 189) ---');

const componentPath = path.join(process.cwd(), 'src', 'components', 'navigation', 'EnterprisePortalHub.tsx');
const pagePath = path.join(process.cwd(), 'src', 'app', 'hub', 'page.tsx');

assert.ok(fs.existsSync(componentPath), 'EnterprisePortalHub.tsx must exist');
assert.ok(fs.existsSync(pagePath), 'src/app/hub/page.tsx must exist');

assert.equal(ENTERPRISE_PORTAL_METADATA.length, 8, 'Must showcase all 8 enterprise systems');

const sandboxPortal = ENTERPRISE_PORTAL_METADATA.find((p) => p.id === 'portal-sandbox');
assert.ok(sandboxPortal);
assert.equal(sandboxPortal.href, '/sandbox');

const queuePortal = ENTERPRISE_PORTAL_METADATA.find((p) => p.id === 'portal-queue');
assert.ok(queuePortal);
assert.equal(queuePortal.href, '/queue');

const govPortal = ENTERPRISE_PORTAL_METADATA.find((p) => p.id === 'portal-governance');
assert.ok(govPortal);
assert.equal(govPortal.href, '/governance');

const pageContent = fs.readFileSync(pagePath, 'utf8');
assert.ok(pageContent.includes('EnterprisePortalHub'), 'Page must import and render EnterprisePortalHub');

console.log('✅ Contribution 189 tests passed cleanly!');
