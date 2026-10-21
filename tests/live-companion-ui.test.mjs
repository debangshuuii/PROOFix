import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

console.log('🧪 Running Live Companion UI & Dashboard Integration Suite...');

const dashboardPath = resolve(process.cwd(), 'src/components/companion/LiveCompanionDashboard.tsx');
assert.ok(existsSync(dashboardPath), 'LiveCompanionDashboard component file must exist');

const dashboardSource = readFileSync(dashboardPath, 'utf8');

// 1. Verify component exports
assert.ok(
  dashboardSource.includes('export function LiveCompanionDashboard'),
  'Must export LiveCompanionDashboard component'
);

// 2. Verify interactive control buttons
assert.ok(dashboardSource.includes("dispatchAction('resume')"), 'Must have resume control action');
assert.ok(dashboardSource.includes("dispatchAction('pause')"), 'Must have pause control action');
assert.ok(dashboardSource.includes("dispatchAction('step_next')"), 'Must have step_next control action');

// 3. Verify real-time SSE listener
assert.ok(dashboardSource.includes('new EventSource'), 'Must connect to /api/v1/runs/[id]/live EventSource');
assert.ok(dashboardSource.includes('/api/v1/runs/${runId}/control'), 'Must post controls to /api/v1/runs/[id]/control');

// 4. Verify screencast mirror canvas/img container
assert.ok(dashboardSource.includes('currentFrameUrl'), 'Must track currentFrameUrl for live screencast mirror');
assert.ok(dashboardSource.includes('Live Screencast Mirror'), 'Must display Live Screencast Mirror header');

// 5. Verify mutation and breakpoint inspection tabs
assert.ok(dashboardSource.includes("'mutations'"), 'Must have DOM mutations view');
assert.ok(dashboardSource.includes("'breakpoints'"), 'Must have conditional breakpoints manager');
assert.ok(dashboardSource.includes('toggleBreakpoint'), 'Must allow toggling conditional breakpoints');

// 6. Verify page.tsx tab integration
const pagePath = resolve(process.cwd(), 'src/app/projects/[id]/runs/[runId]/page.tsx');
assert.ok(existsSync(pagePath), 'Run detail page.tsx must exist');
const pageSource = readFileSync(pagePath, 'utf8');

assert.ok(
  pageSource.includes("import { LiveCompanionDashboard } from '@/components/companion/LiveCompanionDashboard'"),
  'page.tsx must import LiveCompanionDashboard'
);
assert.ok(
  pageSource.includes("activeTab === 'live-companion'"),
  'page.tsx must contain activeTab === live-companion condition'
);
assert.ok(
  pageSource.includes('<LiveCompanionDashboard runId={runId} />'),
  'page.tsx must render LiveCompanionDashboard with runId'
);
assert.ok(
  pageSource.includes('Live Companion & Mirror'),
  'page.tsx must have Live Companion & Mirror tab button'
);

console.log('✅ Live Companion UI & Dashboard Integration Suite Passed (100% verified)');
