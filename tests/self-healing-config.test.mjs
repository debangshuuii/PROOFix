import assert from 'node:assert/strict';
import {
  getDefaultSelfHealingConfig,
  validateSelfHealingConfig,
  isPathEligibleForRepair,
  evaluateSelfHealingEligibility,
} from '../src/lib/repair/self-healing-policy.ts';

console.log('--- Testing Self-Healing Configuration & Policy Guards (Contribution 1 / 101) ---');

function testDefaultConfiguration() {
  const defaults = getDefaultSelfHealingConfig();
  assert.equal(defaults.enabled, false, 'Default self-healing must be disabled to prevent unsolicited changes');
  assert.equal(defaults.mode, 'manual_review_only');
  assert.equal(defaults.maxIterations, 3);
  assert.equal(defaults.minConfidenceScore, 75);
  assert.ok(defaults.allowedFileExtensions.includes('.tsx'));
  assert.ok(defaults.protectedFilePatterns.includes('.env'));
  assert.ok(defaults.protectedFilePatterns.includes('package-lock.json'));

  console.log('[PASS] Safe default configuration verified with master switch disabled.');
}

function testConfigValidationAndClamping() {
  // Test clamping bounds
  const clamped = validateSelfHealingConfig({
    maxIterations: 10,       // Must clamp to 5
    minConfidenceScore: 30,  // Must clamp to 50
    mode: 'invalid_mode',    // Must flag error and fallback
  });

  assert.equal(clamped.config.maxIterations, 5);
  assert.equal(clamped.config.minConfidenceScore, 50);
  assert.equal(clamped.valid, false);
  assert.ok(clamped.errors.some((e) => e.includes('Invalid mode')));

  const validCustom = validateSelfHealingConfig({
    enabled: true,
    mode: 'semi_autonomous',
    maxIterations: 4,
    minConfidenceScore: 85,
  });
  assert.equal(validCustom.valid, true);
  assert.equal(validCustom.config.enabled, true);
  assert.equal(validCustom.config.mode, 'semi_autonomous');

  console.log('[PASS] Configuration validation and clamping bounds enforced.');
}

function testPathEligibilityGuards() {
  const config = getDefaultSelfHealingConfig();

  // 1. Allowed paths
  assert.equal(isPathEligibleForRepair('src/app/page.tsx', config).eligible, true);
  assert.equal(isPathEligibleForRepair('components/Nav.jsx', config).eligible, true);
  assert.equal(isPathEligibleForRepair('styles/theme.css', config).eligible, true);

  // 2. Path Traversal & Absolute Paths
  assert.equal(isPathEligibleForRepair('../outside/hack.ts', config).eligible, false);
  assert.equal(isPathEligibleForRepair('/etc/passwd', config).eligible, false);

  // 3. Protected Files (.env, package-lock.json, Dockerfile)
  assert.equal(isPathEligibleForRepair('.env', config).eligible, false);
  assert.equal(isPathEligibleForRepair('.env.local', config).eligible, false);
  assert.equal(isPathEligibleForRepair('package-lock.json', config).eligible, false);
  assert.equal(isPathEligibleForRepair('Dockerfile', config).eligible, false);

  // 4. Protected Directories (.git, node_modules)
  assert.equal(isPathEligibleForRepair('.git/HEAD', config).eligible, false);
  assert.equal(isPathEligibleForRepair('node_modules/next/index.js', config).eligible, false);

  // 5. Disallowed Extension
  assert.equal(isPathEligibleForRepair('bin/exec.sh', config).eligible, false);

  console.log('[PASS] File path eligibility rules, extension allowlists, and traversal defenses verified.');
}

function testEligibilityEvaluator() {
  const config = {
    ...getDefaultSelfHealingConfig(),
    enabled: true,
    mode: 'semi_autonomous',
    minConfidenceScore: 80,
  };

  const eligibleProposal = {
    id: 'prop_01',
    projectId: 'proj_01',
    runId: 'run_01',
    failureId: 'fail_01',
    commitSha: 'a1b2c3d',
    explanation: 'Fix missing null check',
    proposedChanges: '--- a/src/app/page.tsx\n+++ b/src/app/page.tsx\n',
    affectedFiles: ['src/app/page.tsx'],
    confidenceScore: 90,
    validationStatus: 'valid',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const res = evaluateSelfHealingEligibility(eligibleProposal, config);
  assert.equal(res.allowed, true);

  // Ineligible proposal (low confidence score)
  const lowConfidence = {
    ...eligibleProposal,
    confidenceScore: 60, // below 80
  };
  const lowRes = evaluateSelfHealingEligibility(lowConfidence, config);
  assert.equal(lowRes.allowed, false);
  assert.ok(lowRes.reasons.some((r) => r.includes('confidence score')));

  // Ineligible proposal (affects protected file)
  const protectedTarget = {
    ...eligibleProposal,
    affectedFiles: ['.env'],
  };
  const protRes = evaluateSelfHealingEligibility(protectedTarget, config);
  assert.equal(protRes.allowed, false);
  assert.ok(protRes.reasons.some((r) => r.includes('ineligible')));

  console.log('[PASS] Autonomous self-healing proposal eligibility evaluated against policy gates.');
}

function runSuite() {
  testDefaultConfiguration();
  testConfigValidationAndClamping();
  testPathEligibilityGuards();
  testEligibilityEvaluator();
  console.log('[ALL PASS] Contribution 1 (101) test suite passed.');
}

runSuite();
