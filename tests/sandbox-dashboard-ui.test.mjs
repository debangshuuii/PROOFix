import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

console.log('--- Testing Sandbox Isolation Dashboard UI (Contribution 159) ---');

const componentPath = path.join(process.cwd(), 'src', 'components', 'sandbox', 'SandboxIsolationReport.tsx');
const pagePath = path.join(process.cwd(), 'src', 'app', 'sandbox', 'page.tsx');

assert.ok(fs.existsSync(componentPath), 'SandboxIsolationReport.tsx should exist');
assert.ok(fs.existsSync(pagePath), 'src/app/sandbox/page.tsx should exist');

const componentContent = fs.readFileSync(componentPath, 'utf8');
assert.ok(componentContent.includes("'use client'"), 'Component must be a client component');
assert.ok(componentContent.includes('SandboxIsolationReport'), 'Component must export SandboxIsolationReport');
assert.ok(componentContent.includes('Production Sandbox & MicroVM Isolation'), 'Component must render title');
assert.ok(componentContent.includes('Cgroups v2'), 'Component must mention cgroups v2');
assert.ok(componentContent.includes('Metadata Shield'), 'Component must render metadata shield');
assert.ok(componentContent.includes('Execute Probe in Sandbox'), 'Component must support interactive execution probe');

const pageContent = fs.readFileSync(pagePath, 'utf8');
assert.ok(pageContent.includes('SandboxIsolationReport'), 'Page must import and render SandboxIsolationReport');

console.log('✅ Contribution 159 UI components and page verified cleanly!');
