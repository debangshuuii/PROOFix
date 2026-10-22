/**
 * Master Core Execution & Testing Agents CI Verification Suite
 * Runs and validates all 6 testing and execution agent subsystems in CI.
 */

import { spawnSync } from 'child_process';
import path from 'path';

console.log('===============================================================');
console.log('  PROOFIX CI: CORE EXECUTION & TESTING AGENTS MASTER SUITE      ');
console.log('  Validating All 6 Core Execution & Testing Subsystems in CI   ');
console.log('===============================================================\n');

const testSuites = [
  {
    name: 'Multi-Runtime Launcher & Process Watchdog',
    file: 'tests/framework-execution-launcher.test.mjs',
  },
  {
    name: 'Dynamic Route Navigation & Parameter Synthesizer',
    file: 'tests/dynamic-route-navigation-agent.test.mjs',
  },
  {
    name: 'Backend API Verification & Error Leak Detector',
    file: 'tests/api-verification-agent.test.mjs',
  },
  {
    name: 'Interactive UI & React Hydration Agent',
    file: 'tests/interactive-ui-agent.test.mjs',
  },
  {
    name: 'Quality Auditing: Accessibility & Core Web Vitals',
    file: 'tests/quality-auditing-agents.test.mjs',
  },
  {
    name: 'Viewport Matrix & Telemetry SSE Broadcaster',
    file: 'tests/viewport-telemetry-agents.test.mjs',
  },
];

let totalPassed = 0;
let totalFailed = 0;

for (const suite of testSuites) {
  console.log(`[CI RUNNER] Executing Suite: ${suite.name}...`);
  const isWin = process.platform === 'win32';
  const npxCmd = isWin ? 'npx.cmd' : 'npx';

  const result = spawnSync(npxCmd, ['tsx', suite.file], {
    stdio: 'inherit',
    cwd: process.cwd(),
    shell: true,
  });

  if (result.status === 0) {
    console.log(`  ✓ [PASS] ${suite.name}\n`);
    totalPassed++;
  } else {
    console.error(`  ✗ [FAIL] ${suite.name} (Exit Code: ${result.status})\n`);
    totalFailed++;
  }
}

console.log('===============================================================');
console.log(`  MASTER CI SUMMARY: ${totalPassed} Passed, ${totalFailed} Failed`);
console.log('===============================================================');

if (totalFailed > 0) {
  console.error('\n❌ Master Core Execution CI Suite encountered test failures.');
  process.exit(1);
} else {
  console.log('\n✅ ALL CORE EXECUTION & TESTING SUBSYSTEMS VERIFIED IN CI!');
  process.exit(0);
}
