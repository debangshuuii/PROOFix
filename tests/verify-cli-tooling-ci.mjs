/**
 * PROOFix CLI Tooling & Diagnostics Master CI Verification Suite
 * Comprehensive automated verification across all 4 pillars of the CLI developer tool.
 */

import assert from 'node:assert/strict';
import { colors, symbols, stripAnsi } from '../src/lib/cli/colors.ts';
import { createBox, renderTable } from '../src/lib/cli/table.ts';
import { CliLogger } from '../src/lib/cli/logger.ts';
import { TerminalSpinner } from '../src/lib/cli/spinner.ts';
import { PipelineProgressBar, VERIFICATION_STAGES } from '../src/lib/cli/progressbar.ts';
import { parseDiffStats, renderTerminalDiff } from '../src/lib/cli/diff-viewer.ts';
import { checkNodeVersion } from '../src/lib/cli/doctor/node-check.ts';
import { checkPlaywrightChromium } from '../src/lib/cli/doctor/playwright-check.ts';
import { checkEphemeralPortAllocation } from '../src/lib/cli/doctor/port-check.ts';
import { checkAiProviderKeys } from '../src/lib/cli/doctor/keys-check.ts';
import { autoHealPlaywrightChromium } from '../src/lib/cli/doctor/healer.ts';
import { runDoctorSuite } from '../src/lib/cli/doctor/suite.ts';
import { CliPipelineExecutor } from '../src/lib/cli/runner/pipeline.ts';
import { getProposalForScenario, applyPatch, rollbackPatch } from '../src/lib/cli/fix/patcher.ts';
import { WatchJourneyMapper } from '../src/lib/cli/watch/journey-mapper.ts';
import { parseArgs } from '../src/lib/cli/dispatcher.ts';

let passed = 0;
let total = 0;

function runStep(name, fn) {
  total++;
  try {
    fn();
    console.log(`  ${colors.green('✓ [PASS]')} Step ${total}: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ${colors.red('✖ [FAIL]')} Step ${total}: ${name}`);
    console.error(`    ${err && err.message ? err.message : err}`);
  }
}

async function runStepAsync(name, fn) {
  total++;
  try {
    await fn();
    console.log(`  ${colors.green('✓ [PASS]')} Step ${total}: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ${colors.red('✖ [FAIL]')} Step ${total}: ${name}`);
    console.error(`    ${err && err.message ? err.message : err}`);
  }
}

console.log('='.repeat(70));
console.log(' PROOFix CLI TOOLING & DIAGNOSTICS MASTER CI VERIFICATION SUITE');
console.log('='.repeat(70));

// SECTION 1: Formatting Primitives
console.log('\n--- SECTION 1: Terminal Formatting & TUI Primitives ---');

runStep('ANSI colors, badges, and stripAnsi utility', () => {
  const styled = colors.green(colors.bold('PROOFix CLI'));
  assert.equal(stripAnsi(styled), 'PROOFix CLI');
  assert.equal(symbols.tick, '✓');
});

runStep('Terminal box and columnar table formatting', () => {
  const box = createBox('Test Box', ['Item 1', 'Item 2']);
  assert.ok(stripAnsi(box).includes('Test Box'));

  const table = renderTable(
    [{ header: 'Check' }, { header: 'Status' }],
    [{ check: 'Node.js', status: 'PASS' }]
  );
  assert.ok(stripAnsi(table).includes('Node.js'));
});

runStep('Structured logger level filtering and buffer capture', () => {
  const logger = new CliLogger({ captureLogs: true, level: 'warn' });
  logger.info('Info message');
  logger.warn('Warn message');
  const captured = logger.getCapturedLogs();
  assert.equal(captured.length, 1);
});

runStep('11-stage verification progress bar rendering', () => {
  const bar = new PipelineProgressBar(25);
  const rendered = bar.render({
    stageIndex: 3,
    totalStages: 11,
    stageName: 'Visual Pixel Regression',
    status: 'running',
    elapsedMs: 850,
  });
  assert.ok(stripAnsi(rendered).includes('Visual Pixel Regression'));
  assert.ok(stripAnsi(rendered).includes('[4/11]'));
});

runStep('Unified diff parser and ANSI highlighter', () => {
  const diff = `--- a/file.ts\n+++ b/file.ts\n@@ -1,2 +1,3 @@\n-old\n+new\n+line`;
  const stats = parseDiffStats(diff);
  assert.equal(stats.additions, 2);
  assert.equal(stats.deletions, 1);
  const rendered = renderTerminalDiff(diff, { showLineNumbers: false });
  assert.ok(stripAnsi(rendered).includes('+new'));
});

// SECTION 2: Doctor Diagnostics
console.log('\n--- SECTION 2: Doctor Diagnostic Battery ---');

runStep('Node.js runtime version check (>= 20.0.0)', () => {
  const check = checkNodeVersion();
  assert.equal(check.status, 'passed');
  assert.equal(check.id, 'node_version');
});

await runStepAsync('Playwright Chromium browser binary detection', async () => {
  const check = await checkPlaywrightChromium();
  assert.ok(['passed', 'warning'].includes(check.status));
  assert.equal(check.id, 'playwright_chromium');
});

await runStepAsync('Ephemeral TCP loopback port allocation permissions', async () => {
  const check = await checkEphemeralPortAllocation();
  assert.equal(check.status, 'passed');
  assert.equal(check.id, 'ephemeral_ports');
});

runStep('AI provider API key validation and fallback mode', () => {
  const check = checkAiProviderKeys();
  assert.ok(['passed', 'warning'].includes(check.status));
  assert.equal(check.id, 'ai_provider_keys');
});

await runStepAsync('Automated Playwright Chromium self-healer mock execution', async () => {
  const healRes = await autoHealPlaywrightChromium({ mockSuccess: true });
  assert.equal(healRes.success, true);
  assert.equal(healRes.healedCheck?.status, 'healed');
});

// SECTION 3: Execution Pipeline & Patch Management
console.log('\n--- SECTION 3: 11-Stage Pipeline & Patch Management ---');

await runStepAsync('Pipeline executor runs 11 verification stages against scenario', async () => {
  const executor = new CliPipelineExecutor();
  const result = await executor.execute({ scenario: 'ecommerce_checkout' });
  assert.equal(result.stages.length, 11);
  assert.equal(result.scenarioId, 'ecommerce_checkout');
  assert.equal(result.status, 'failed'); // Defect detected
});

runStep('Atomic patch application and rollback manager', () => {
  const proposal = getProposalForScenario('ecommerce_checkout');
  assert.ok(proposal);
  const applyRes = applyPatch(proposal, true);
  assert.equal(applyRes.success, true);
  const rollbackRes = rollbackPatch('ecommerce_checkout', true);
  assert.equal(rollbackRes.success, true);
});

// SECTION 4: Watch Mode & Dispatcher
console.log('\n--- SECTION 4: Local Watch Mode & Command Routing ---');

runStep('Watch journey mapper matches modified files to target scenarios', () => {
  const checkoutTargets = WatchJourneyMapper.mapFiles(['src/app/checkout/CheckoutForm.tsx']);
  assert.equal(checkoutTargets[0]?.scenarioId, 'ecommerce_checkout');

  const hydrationTargets = WatchJourneyMapper.mapFiles(['src/components/LiveServerClock.tsx']);
  assert.equal(hydrationTargets[0]?.scenarioId, 'hydration_mismatch');
});

runStep('Dispatcher parses command line flags and subcommands', () => {
  const parsed = parseArgs(['run', '-i', '--scenario', 'ecommerce_checkout', '--headless']);
  assert.equal(parsed.command, 'run');
  assert.equal(parsed.flags.interactive, true);
  assert.equal(parsed.flags.scenario, 'ecommerce_checkout');
  assert.equal(parsed.flags.headless, true);
});

console.log('\n' + '='.repeat(70));
if (passed === total) {
  console.log(` ${colors.green(`[SUCCESS] All ${passed} of ${total} CLI Tooling CI steps PASSED!`)}`);
  console.log('='.repeat(70) + '\n');
  process.exit(0);
} else {
  console.error(` ${colors.red(`[FAILURE] ${total - passed} of ${total} CLI Tooling CI steps FAILED!`)}`);
  console.log('='.repeat(70) + '\n');
  process.exit(1);
}
