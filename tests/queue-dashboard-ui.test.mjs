import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

console.log('--- Testing Distributed Queue & Job Telemetry Dashboard UI (Contribution 169) ---');

const componentPath = path.join(process.cwd(), 'src', 'components', 'queue', 'DistributedQueueDashboard.tsx');
const pagePath = path.join(process.cwd(), 'src', 'app', 'queue', 'page.tsx');

assert.ok(fs.existsSync(componentPath), 'DistributedQueueDashboard.tsx must exist');
assert.ok(fs.existsSync(pagePath), 'src/app/queue/page.tsx must exist');

const componentContent = fs.readFileSync(componentPath, 'utf8');
assert.ok(componentContent.includes("'use client'"), 'Component must be a client component');
assert.ok(componentContent.includes('DistributedQueueDashboard'), 'Component must export DistributedQueueDashboard');
assert.ok(componentContent.includes('Distributed Queue & Database Architecture'), 'Component must render title');
assert.ok(componentContent.includes('Dead-Letter Queue Quarantine'), 'Component must render DLQ section');
assert.ok(componentContent.includes('Worker Coordinator'), 'Component must render worker coordinator');
assert.ok(componentContent.includes('Enqueue Job Probe'), 'Component must support job dispatching');

const pageContent = fs.readFileSync(pagePath, 'utf8');
assert.ok(pageContent.includes('DistributedQueueDashboard'), 'Page must import and render DistributedQueueDashboard');

console.log('✅ Contribution 169 UI component and page verified cleanly!');
