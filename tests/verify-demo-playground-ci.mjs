#!/usr/bin/env node

/**
 * MASTER CI VERIFICATION SUITE: Zero-Setup Interactive Demo Playground
 *
 * Verifies all 3 interactive demo scenarios and end-to-end sandbox lifecycle:
 *  1. E-Commerce Broken Checkout (click timeout + missing /api/checkout 404)
 *  2. Next.js SSR Hydration Drift (React 19 console error interception)
 *  3. SQL Injection Security Preflight Gate (CWE-89 AST blocker + parameterized fix)
 *  4. PlaygroundEngine provisioning, simulation, and post-patch verification
 *  5. Global Command Palette and UI component integration
 */

import assert from 'node:assert/strict';
import { ScenarioRegistry, ALL_DEMO_SCENARIOS } from '../src/lib/playground/registry.ts';
import { PlaygroundEngine } from '../src/lib/playground/playground-engine.ts';
import { ECOMMERCE_CHECKOUT_SCENARIO } from '../src/lib/playground/scenarios/ecommerce-checkout.ts';
import { HYDRATION_MISMATCH_SCENARIO } from '../src/lib/playground/scenarios/hydration-mismatch.ts';
import { SQL_INJECTION_PREFLIGHT_SCENARIO } from '../src/lib/playground/scenarios/sql-injection-preflight.ts';
import { globalCommandIndexer } from '../src/lib/navigation/command-indexer.ts';
import { db } from '../src/lib/db/index.ts';

console.log('\n======================================================================');
console.log(' PROOFix ZERO-SETUP INTERACTIVE PLAYGROUND MASTER CI SUITE');
console.log('======================================================================\n');

let passCount = 0;
let totalCount = 0;

function runStep(title, fn) {
  totalCount++;
  try {
    fn();
    passCount++;
    console.log(`  \x1b[32m✓\x1b[0m [PASS] Step ${totalCount}: ${title}`);
  } catch (err) {
    console.error(`  \x1b[31m✕\x1b[0m [FAIL] Step ${totalCount}: ${title}`);
    console.error(`         Error: ${err.message}\n`);
    throw err;
  }
}

async function runStepAsync(title, fn) {
  totalCount++;
  try {
    await fn();
    passCount++;
    console.log(`  \x1b[32m✓\x1b[0m [PASS] Step ${totalCount}: ${title}`);
  } catch (err) {
    console.error(`  \x1b[31m✕\x1b[0m [FAIL] Step ${totalCount}: ${title}`);
    console.error(`         Error: ${err.message}\n`);
    throw err;
  }
}

async function main() {
  console.log('--- SECTION 1: Scenario Registry & Catalog Contracts ---');

  runStep('ScenarioRegistry indexes exactly 3 pre-packaged scenarios', () => {
    assert.equal(ALL_DEMO_SCENARIOS.length, 3);
    assert.equal(ScenarioRegistry.listScenarios().length, 3);
  });

  runStep('ScenarioRegistry filters scenarios by category accurately', () => {
    const e2e = ScenarioRegistry.listScenarios('functional_e2e');
    assert.equal(e2e.length, 1);
    assert.equal(e2e[0].id, 'ecommerce_checkout');

    const react = ScenarioRegistry.listScenarios('framework_react');
    assert.equal(react.length, 1);
    assert.equal(react[0].id, 'hydration_mismatch');

    const sec = ScenarioRegistry.listScenarios('security_preflight');
    assert.equal(sec.length, 1);
    assert.equal(sec[0].id, 'sql_injection_preflight');
  });

  runStep('ScenarioRegistry searches by keyword', () => {
    const res = ScenarioRegistry.listScenarios('all', 'hydration');
    assert.equal(res.length, 1);
    assert.equal(res[0].id, 'hydration_mismatch');
  });

  console.log('\n--- SECTION 2: Scenario 1 - E-Commerce Broken Checkout ---');

  runStep('ECOMMERCE_CHECKOUT_SCENARIO defines valid 404 fault signature', () => {
    assert.equal(ECOMMERCE_CHECKOUT_SCENARIO.fault.expectedFailure.httpStatus, 404);
    assert.equal(ECOMMERCE_CHECKOUT_SCENARIO.fault.expectedFailure.domSelector, '#place-order-btn');
    assert.ok(ECOMMERCE_CHECKOUT_SCENARIO.fixProposal.patchDiff.includes('/api/checkout/route.ts'));
  });

  await runStepAsync('Playwright Engine provisions and executes Checkout simulation', async () => {
    const launch = await PlaygroundEngine.launchDemoRun('ecommerce_checkout');
    assert.equal(launch.success, true);
    assert.ok(launch.runUrl.includes(launch.runId));

    const run = await db.getRunById(launch.runId);
    assert.ok(run);
    assert.equal(run.status, 'failed');

    const fix = await PlaygroundEngine.applyDemoFix('ecommerce_checkout', launch.runId);
    assert.equal(fix.success, true);
    assert.equal(fix.status, 'passed');
    assert.equal(fix.testsFailed, 0);
  });

  console.log('\n--- SECTION 3: Scenario 2 - Next.js SSR Hydration Drift ---');

  runStep('HYDRATION_MISMATCH_SCENARIO defines React 19 console error signature', () => {
    assert.ok(HYDRATION_MISMATCH_SCENARIO.fault.expectedFailure.errorMessage.includes('Hydration failed'));
    assert.equal(HYDRATION_MISMATCH_SCENARIO.benchmark.aiDiagnosisConfidence, 0.98);
  });

  await runStepAsync('Playwright Engine provisions and executes Hydration simulation', async () => {
    const launch = await PlaygroundEngine.launchDemoRun('hydration_mismatch');
    assert.equal(launch.success, true);

    const fix = await PlaygroundEngine.applyDemoFix('hydration_mismatch', launch.runId);
    assert.equal(fix.success, true);
    assert.equal(fix.patchApplied, true);
  });

  console.log('\n--- SECTION 4: Scenario 3 - SQL Injection Preflight Gate ---');

  runStep('SQL_INJECTION_PREFLIGHT_SCENARIO defines CWE-89 Gate Blocker', () => {
    assert.equal(SQL_INJECTION_PREFLIGHT_SCENARIO.fault.severity, 'critical');
    assert.ok(SQL_INJECTION_PREFLIGHT_SCENARIO.fault.cveReference?.includes('CWE-89'));
    assert.ok(SQL_INJECTION_PREFLIGHT_SCENARIO.fixProposal.patchDiff.includes('$1'));
  });

  await runStepAsync('Playwright Engine provisions and executes SQLi Preflight simulation', async () => {
    const launch = await PlaygroundEngine.launchDemoRun('sql_injection_preflight');
    assert.equal(launch.success, true);

    const fix = await PlaygroundEngine.applyDemoFix('sql_injection_preflight', launch.runId);
    assert.equal(fix.success, true);
    assert.equal(fix.status, 'passed');
  });

  console.log('\n--- SECTION 5: Command Palette & Navigation Integration ---');

  runStep('Global Command Palette indexes playground actions and matches search', () => {
    const actions = globalCommandIndexer.getAllActions();
    const overview = actions.find((a) => a.id === 'demo-playground-overview');
    assert.ok(overview);
    assert.equal(overview.href, '/#playground');

    const matches = globalCommandIndexer.search('checkout');
    assert.ok(matches.some((m) => m.id === 'demo-scenario-checkout'));
  });

  console.log('\n--- SECTION 6: Atomic State Reset ---');

  await runStepAsync('PlaygroundEngine resets scenario back to baseline', async () => {
    const reset = await PlaygroundEngine.resetScenario('ecommerce_checkout');
    assert.equal(reset.success, true);
    const restoredRun = await db.getRunById('run-demo-ecommerce-checkout-baseline');
    assert.ok(restoredRun);
    assert.equal(restoredRun.status, 'failed');
  });

  console.log('\n======================================================================');
  console.log(`\x1b[32m [SUCCESS] All ${passCount} of ${totalCount} Interactive Playground CI steps PASSED!\x1b[0m`);
  console.log('======================================================================\n');
}

main().catch((err) => {
  console.error('\n\x1b[31m[FATAL CI ERROR]\x1b[0m', err);
  process.exit(1);
});
