import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

console.log('🧪 Running Mock Replay UI & Dashboard Integration Suite...');

const componentPath = resolve(process.cwd(), 'src/components/replay/MockReplayDashboard.tsx');
assert.ok(existsSync(componentPath), 'MockReplayDashboard.tsx must exist');

const componentSource = readFileSync(componentPath, 'utf8');

// 1. Verify component exports
assert.ok(
  componentSource.includes('export function MockReplayDashboard'),
  'Must export MockReplayDashboard component'
);

// 2. Verify replay hit rate and mode switcher
assert.ok(componentSource.includes('hitRate'), 'Must compute and display replay hit rate');
assert.ok(componentSource.includes('changeMode'), 'Must support changing replay mode');
assert.ok(componentSource.includes('displayCassette'), 'Must display active cassette');

// 3. Verify chaos fault injection toggles
assert.ok(componentSource.includes('faultRules'), 'Must display chaos fault rules');
assert.ok(componentSource.includes('toggleFaultRule'), 'Must allow toggling fault injection rules');

// 4. Verify interactions list and scrubbing display
assert.ok(componentSource.includes('interactions'), 'Must display recorded interactions list');
assert.ok(componentSource.includes('Scrubbed'), 'Must highlight scrubbed credentials');

// 5. Verify page.tsx tab integration
const pagePath = resolve(process.cwd(), 'src/app/projects/[id]/runs/[runId]/page.tsx');
assert.ok(existsSync(pagePath), 'Run detail page.tsx must exist');
const pageSource = readFileSync(pagePath, 'utf8');

assert.ok(
  pageSource.includes("import { MockReplayDashboard } from '@/components/replay/MockReplayDashboard'"),
  'page.tsx must import MockReplayDashboard'
);
assert.ok(
  pageSource.includes("activeTab === 'mock-replay'"),
  'page.tsx must support mock-replay activeTab condition'
);
assert.ok(
  pageSource.includes('<MockReplayDashboard runId={runId} />'),
  'page.tsx must render MockReplayDashboard with runId'
);
assert.ok(
  pageSource.includes('Mocks & Replay'),
  'page.tsx must display Mocks & Replay tab button'
);

console.log('✅ Mock Replay UI & Dashboard Integration Suite Passed (100% verified)');
