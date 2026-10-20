import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('--- Testing Self-Healing Dashboard UI Component (Contribution 109) ---');

// 1. Verify SelfHealingDashboard component file exists and exports proper symbols
function testComponentFileAndExports() {
  const compPath = path.join(__dirname, '..', 'src', 'components', 'repair', 'SelfHealingDashboard.tsx');
  assert.ok(fs.existsSync(compPath), 'SelfHealingDashboard.tsx must exist');
  
  const content = fs.readFileSync(compPath, 'utf8');
  assert.ok(content.includes('export function SelfHealingDashboard'), 'Should export SelfHealingDashboard');
  assert.ok(content.includes('interface SelfHealingDashboardProps'), 'Should define SelfHealingDashboardProps');
  assert.ok(content.includes('onApproveAndPublish'), 'Should support onApproveAndPublish callback');
  assert.ok(content.includes('onReject'), 'Should support onReject callback');
  console.log('[PASS] SelfHealingDashboard component is properly exported with expected prop interfaces.');
}

// 2. Verify Run Page integration
function testRunPageIntegration() {
  const pagePath = path.join(__dirname, '..', 'src', 'app', 'projects', '[id]', 'runs', '[runId]', 'page.tsx');
  assert.ok(fs.existsSync(pagePath), 'Run page.tsx must exist');

  const content = fs.readFileSync(pagePath, 'utf8');
  assert.ok(
    content.includes("import { SelfHealingDashboard } from '@/components/repair/SelfHealingDashboard'"),
    'Run page must import SelfHealingDashboard'
  );
  assert.ok(
    content.includes("'self-healing'"),
    'activeTab state union must include self-healing'
  );
  assert.ok(
    content.includes("setActiveTab('self-healing')"),
    'Run page must contain a tab button switching to self-healing'
  );
  assert.ok(
    content.includes("<SelfHealingDashboard />") || content.includes("<SelfHealingDashboard"),
    'Run page must render SelfHealingDashboard when activeTab is self-healing'
  );
  console.log('[PASS] Verification Run page successfully integrates SelfHealingDashboard into tab navigation.');
}

// 3. Verify SelfHealingDashboard renders 5-stage pipeline and safe telemetry
function testTelemetryAndPipelineStages() {
  const compPath = path.join(__dirname, '..', 'src', 'components', 'repair', 'SelfHealingDashboard.tsx');
  const content = fs.readFileSync(compPath, 'utf8');

  // Verify pipeline stages
  assert.ok(content.includes('1. Context'), 'Pipeline must include stage 1: Context');
  assert.ok(content.includes('2. Patch Gen'), 'Pipeline must include stage 2: Patch Gen');
  assert.ok(content.includes('3. Sandboxing'), 'Pipeline must include stage 3: Sandboxing');
  assert.ok(content.includes('4. Prover'), 'Pipeline must include stage 4: Prover');
  assert.ok(content.includes('5. Pull Request'), 'Pipeline must include stage 5: Pull Request');

  // Verify interactive review controls
  assert.ok(content.includes('Approve Fix'), 'Must feature manual Approve Fix action');
  assert.ok(content.includes('Reject'), 'Must feature manual Reject action');
  assert.ok(content.includes('Prover Execution Telemetry'), 'Must render telemetry console');
  console.log('[PASS] SelfHealingDashboard includes all 5 pipeline stages and manual review actions.');
}

// Run all test suites
testComponentFileAndExports();
testRunPageIntegration();
testTelemetryAndPipelineStages();

console.log('\nAll Self-Healing Dashboard UI tests passed cleanly!');
