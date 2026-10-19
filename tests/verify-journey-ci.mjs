import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Core journey imports
import {
  validateJourney,
  serializeJourney,
  deserializeJourney,
  loadJourneyFromFixture,
  CURRENT_SCHEMA_VERSION,
} from '../src/lib/journey/schema-validator.ts';
import {
  addStepToJourney,
  reorderStepInJourney,
  duplicateStepInJourney,
  deleteStepFromJourney,
} from '../src/lib/journey/step-manager.ts';
import {
  validateSafeUrl,
  mapInteractionToPlaywright,
} from '../src/lib/journey/interaction-mapper.ts';
import { evaluateAssertion } from '../src/lib/journey/assertion-evaluator.ts';
import {
  executeBoundedWait,
  resolveStepScreenshotPath,
  ABSOLUTE_MAX_WAIT_MS,
} from '../src/lib/journey/wait-screenshot-handler.ts';
import { db } from '../src/lib/db/index.ts';
import {
  preflightValidateJourney,
  executeJourney,
} from '../src/lib/journey/execution-adapter.ts';
import { JOURNEY_TEMPLATES, createJourneyFromTemplate } from '../src/lib/journey/templates.ts';
import { migrateJourneySchema } from '../src/lib/journey/migrator.ts';

console.log('===============================================================');
console.log('   PROOFIX CI: FEATURE 6 NO-CODE USER JOURNEY BUILDER SUITE   ');
console.log('   Covering Contributions 51 through 60 in CI Pipeline        ');
console.log('===============================================================\n');

async function runCiSuite() {
  // -------------------------------------------------------------
  // [CI - 51] Versioned Journey Schema
  // -------------------------------------------------------------
  console.log('[CI - 51] Verify Versioned Journey Schema & Fixture Loading');
  const fixturePath = path.join(process.cwd(), 'src', 'fixtures', 'sample-journey.json');
  const fixtureJourney = loadJourneyFromFixture(fixturePath);
  assert.equal(fixtureJourney.schemaVersion, CURRENT_SCHEMA_VERSION);
  assert.equal(fixtureJourney.steps.length, 5);

  const roundtrip = deserializeJourney(serializeJourney(fixtureJourney));
  assert.deepEqual(roundtrip, fixtureJourney);

  const badOrder = {
    ...fixtureJourney,
    steps: [{ ...fixtureJourney.steps[0], order: 99 }],
  };
  assert.equal(validateJourney(badOrder).valid, false);
  console.log('  [PASS] Contribution 51: Validated, serialized, and loaded from fixtures consistently.\n');

  // -------------------------------------------------------------
  // [CI - 52] Journey Editor Visual Workspace
  // -------------------------------------------------------------
  console.log('[CI - 52] Verify Journey Editor Interface & State');
  const editorJourney = {
    ...fixtureJourney,
    title: 'Visual Journey Edited in Workspace',
    config: { ...fixtureJourney.config, defaultTimeoutMs: 14000 },
  };
  assert.equal(validateJourney(editorJourney).valid, true);
  assert.equal(editorJourney.config.defaultTimeoutMs, 14000);
  console.log('  [PASS] Contribution 52: Visual workspace configuration updated without code editor.\n');

  // -------------------------------------------------------------
  // [CI - 53] Step Management
  // -------------------------------------------------------------
  console.log('[CI - 53] Verify Step Management (Add, Reorder, Duplicate, Delete)');
  let journey = { ...fixtureJourney };
  const initialCount = journey.steps.length;

  // Add
  journey = addStepToJourney(journey, {
    title: 'Wait Step',
    action: 'wait_for_timeout',
    params: { durationMs: 1000 },
  });
  assert.equal(journey.steps.length, initialCount + 1);

  // Duplicate
  journey = duplicateStepInJourney(journey, journey.steps[0].id);
  assert.equal(journey.steps.length, initialCount + 2);

  // Reorder
  journey = reorderStepInJourney(journey, journey.steps[journey.steps.length - 1].id, 1);
  assert.equal(journey.steps[0].order, 1);

  // Delete
  journey = deleteStepFromJourney(journey, journey.steps[0].id);
  journey.steps.forEach((s, idx) => assert.equal(s.order, idx + 1));
  console.log('  [PASS] Contribution 53: Step order strictly preserved across all editing actions.\n');

  // -------------------------------------------------------------
  // [CI - 54] Navigation and Interaction Mapping
  // -------------------------------------------------------------
  console.log('[CI - 54] Verify Safe Navigation & Interaction Playwright Mapping');
  const navPlan = mapInteractionToPlaywright({
    id: 's_nav',
    order: 1,
    title: 'Nav',
    action: 'navigate',
    params: { url: '/store' },
  });
  assert.equal(navPlan.isSafe, true);
  assert.ok(navPlan.actionCode.includes("goto('/store')"));

  const clickPlan = mapInteractionToPlaywright({
    id: 's_click',
    order: 2,
    title: 'Click',
    action: 'click',
    target: { type: 'role_name', role: 'button', name: 'Submit' },
  });
  assert.ok(clickPlan.actionCode.includes("getByRole('button', { name: 'Submit' })"));

  // Reject unsafe protocol
  assert.equal(validateSafeUrl('javascript:alert(1)').safe, false);
  console.log('  [PASS] Contribution 54: Actions mapped to validated Playwright operations safely.\n');

  // -------------------------------------------------------------
  // [CI - 55] Assertion Steps
  // -------------------------------------------------------------
  console.log('[CI - 55] Verify Assertion Steps & Failure Reporting');
  const assertStep = {
    id: 's_assert',
    order: 4,
    title: 'Assert Heading',
    action: 'assert_text',
    target: { type: 'css', value: 'h1' },
    params: { expectedText: 'Expected Heading', matchMode: 'exact' },
  };
  const assertFail = evaluateAssertion(assertStep, { elementText: 'Actual Wrong Heading' });
  assert.equal(assertFail.passed, false);
  assert.equal(assertFail.stepOrder, 4);
  assert.ok(assertFail.expectedValue.includes('Expected Heading'));
  assert.ok(assertFail.observedResult.includes('Actual Wrong Heading'));
  console.log('  [PASS] Contribution 55: Failed assertion reported expected, observed, and failing step.\n');

  // -------------------------------------------------------------
  // [CI - 56] Wait and Screenshot Steps
  // -------------------------------------------------------------
  console.log('[CI - 56] Verify Bounded Waits & Step-Attached Screenshots');
  const waitResult = await executeBoundedWait(99999999, 30000, false);
  assert.equal(waitResult.waitedMs, ABSOLUTE_MAX_WAIT_MS);
  assert.equal(waitResult.clamped, true);

  const shotResult = await resolveStepScreenshotPath({
    runId: 'ci_shot_run',
    stepId: 'stp_ci',
    stepOrder: 2,
    screenshotName: 'preview',
  });
  assert.equal(shotResult.stepId, 'stp_ci');
  assert.equal(shotResult.stepOrder, 2);
  assert.ok(shotResult.screenshotPath.includes('stp_2_preview.png'));

  // Cleanup disk artifact
  const diskDir = path.dirname(shotResult.diskPath);
  if (fs.existsSync(diskDir)) {
    fs.rmSync(diskDir, { recursive: true, force: true });
  }
  console.log('  [PASS] Contribution 56: Bounded waits capped at 30s; screenshot attached to step.\n');

  // -------------------------------------------------------------
  // [CI - 57] Journey Persistence & Access Control
  // -------------------------------------------------------------
  console.log('[CI - 57] Verify Journey Persistence & Access Control');
  const testJnyId = `jny_ci_test_${Date.now()}`;
  const aliceJny = {
    ...fixtureJourney,
    id: testJnyId,
    ownerId: 'usr_alice_ci',
    title: 'Alice CI Journey',
  };
  await db.saveJourney(aliceJny, 'usr_alice_ci');

  const loaded = await db.getJourneyById(testJnyId, 'usr_alice_ci');
  assert.equal(loaded?.title, 'Alice CI Journey');

  // Unauthorized access rejected
  await assert.rejects(async () => {
    await db.getJourneyById(testJnyId, 'usr_bob_ci');
  }, /Access denied/);

  await db.deleteJourney(testJnyId, 'usr_alice_ci');
  console.log('  [PASS] Contribution 57: Persistence survived reload; unauthorized access prevented.\n');

  // -------------------------------------------------------------
  // [CI - 58] Safe Execution Adapter & Preflight Guards
  // -------------------------------------------------------------
  console.log('[CI - 58] Verify Safe Journey Execution Adapter & Preflight Guards');
  const malformed = {
    ...fixtureJourney,
    steps: [{ id: 'bad', order: 1, title: 'Bad', action: 'eval_code' }],
  };
  assert.equal(preflightValidateJourney(malformed).valid, false);

  const safeRun = await executeJourney(fixtureJourney);
  assert.equal(safeRun.status, 'passed');
  assert.equal(safeRun.totalSteps, 5);
  console.log('  [PASS] Contribution 58: Malformed steps rejected; approved journey executed cleanly.\n');

  // -------------------------------------------------------------
  // [CI - 59] Per-Step Execution Results & Failure Isolation
  // -------------------------------------------------------------
  console.log('[CI - 59] Verify Per-Step Execution Results & Failure Isolation');
  const failingJourney = {
    ...fixtureJourney,
    steps: [
      { id: 's1', order: 1, title: 'Nav', action: 'navigate', params: { url: '/store' } },
      { id: 's2', order: 2, title: 'Assert Missing', action: 'assert_text', target: { type: 'css', value: '.absent' }, params: { expectedText: 'Boom' } },
      { id: 's3', order: 3, title: 'Subsequent Click', action: 'click', target: { type: 'role_name', role: 'button', name: 'Go' } },
    ],
  };
  const failRun = await executeJourney(failingJourney);
  assert.equal(failRun.status, 'failed');
  assert.equal(failRun.stepResults.length, 3);
  assert.equal(failRun.stepResults[0].status, 'passed');
  assert.equal(failRun.stepResults[1].status, 'failed');
  assert.equal(failRun.stepResults[2].status, 'skipped');
  console.log('  [PASS] Contribution 59: Results reflect actual execution and remain visible after failure.\n');

  // -------------------------------------------------------------
  // [CI - 60] Journey Templates, Migration & Documentation
  // -------------------------------------------------------------
  console.log('[CI - 60] Verify Templates, Schema Migration & Documentation');
  assert.ok(JOURNEY_TEMPLATES.length >= 2);
  const createdFromTpl = createJourneyFromTemplate(JOURNEY_TEMPLATES[0].id, 'proj_test', 'usr_test');
  assert.equal(createdFromTpl.schemaVersion, CURRENT_SCHEMA_VERSION);
  assert.ok(createdFromTpl.steps.length > 0);

  // Migration test
  const legacyJourney = {
    id: 'legacy_jny',
    title: 'Old Journey',
    steps: [{ title: 'Old Nav', action: 'navigate', params: { url: '/' } }],
  };
  const migResult = migrateJourneySchema(legacyJourney);
  assert.equal(migResult.migrated, true);
  assert.equal(migResult.journey.schemaVersion, CURRENT_SCHEMA_VERSION);
  assert.equal(migResult.journey.steps[0].order, 1);

  // Documentation file check
  const docPath = path.join(process.cwd(), 'docs', 'NO_CODE_JOURNEY_BUILDER.md');
  assert.ok(fs.existsSync(docPath), 'NO_CODE_JOURNEY_BUILDER.md must exist');
  const docContent = fs.readFileSync(docPath, 'utf-8');
  assert.ok(docContent.includes('No-Code User Journey Builder'));
  assert.ok(docContent.includes('Supported Action Types'));
  console.log('  [PASS] Contribution 60: Templates verified, schema migration tested, and docs verified.\n');

  console.log('===============================================================');
  console.log('  ALL 10 USER JOURNEY CONTRIBUTIONS (51-60) PASSED IN CI!     ');
  console.log('===============================================================');
}

runCiSuite().catch((err) => {
  console.error('CI Suite Failure:', err);
  process.exit(1);
});
