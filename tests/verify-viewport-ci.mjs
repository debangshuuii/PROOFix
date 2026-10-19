import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Core imports from viewport modules
import { validateViewportProfile, assertValidViewportProfile } from '../src/lib/viewport/profile-schema.ts';
import {
  getDefaultViewportPresets,
  setPresetEnabled,
  customizePreset,
  addCustomPreset,
  getEnabledPresets,
} from '../src/lib/viewport/presets.ts';
import { runMultiViewportVerification } from '../src/lib/viewport/runner.ts';
import { deriveViewportRecordsFromResults } from '../src/lib/viewport/derive-records.ts';
import {
  analyzeFixtureDomOverflow,
  DEFAULT_ALLOWED_OVERFLOW_SELECTORS,
} from '../src/lib/viewport/overflow-detector.ts';
import { auditResponsiveNavigation } from '../src/lib/viewport/navigation-checker.ts';
import { verifyFormAtViewport } from '../src/lib/viewport/form-verifier.ts';
import {
  buildPlaywrightEmulationContext,
  generateEmulationDistinctionReport,
} from '../src/lib/viewport/touch-emulator.ts';
import { executeBoundedMatrix } from '../src/lib/viewport/resource-limits.ts';

console.log('===============================================================');
console.log('   PROOFIX CI: FEATURE 5 MULTI-DEVICE VIEWPORT MATRIX SUITE   ');
console.log('   Covering Contributions 41 through 50 in CI Pipeline        ');
console.log('===============================================================\n');

async function runCiSuite() {
  // -------------------------------------------------------------
  // [CI - 41] Viewport Profile Schema
  // -------------------------------------------------------------
  console.log('[CI - 41] Verify Viewport Profile Schema & Validation');
  const validProfile = {
    id: 'desktop-hd',
    name: 'Desktop HD',
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1.0,
    hasTouch: false,
    isMobile: false,
  };
  const valRes = validateViewportProfile(validProfile);
  assert.equal(valRes.valid, true);

  const invalidWidth = { id: 'bad-w', name: 'Bad', width: -50, height: 720 };
  assert.equal(validateViewportProfile(invalidWidth).valid, false);

  const floatHeight = { id: 'bad-h', name: 'Bad', width: 1024, height: 768.4 };
  assert.equal(validateViewportProfile(floatHeight).valid, false);
  console.log('  [PASS] Contribution 41: Valid profiles accepted and invalid dimensions rejected.\n');

  // -------------------------------------------------------------
  // [CI - 42] Default Viewport Presets
  // -------------------------------------------------------------
  console.log('[CI - 42] Verify Default Viewport Presets & Customization');
  const defaults = getDefaultViewportPresets();
  assert.equal(defaults.length, 3);
  assert.ok(defaults.find((p) => p.width === 1440 && p.height === 900));
  assert.ok(defaults.find((p) => p.width === 768 && p.height === 1024));
  assert.ok(defaults.find((p) => p.width === 390 && p.height === 844));
  for (const preset of defaults) {
    assert.ok(preset.disclaimer.includes('Viewport Preset'));
  }

  // Toggle & customize
  const toggled = setPresetEnabled(defaults, 'mobile-390x844', false);
  assert.equal(getEnabledPresets(toggled).length, 2);

  const customized = customizePreset(defaults, 'desktop-1440x900', { width: 1600, height: 900 });
  assert.equal(customized.find((p) => p.id === 'desktop-1440x900')?.width, 1600);
  console.log('  [PASS] Contribution 42: Default presets (1440x900, 768x1024, 390x844) customizable & labeled.\n');

  // -------------------------------------------------------------
  // [CI - 43] Extended Runner Multi-Viewport Execution
  // -------------------------------------------------------------
  console.log('[CI - 43] Verify Runner Multi-Viewport Matrix Execution');
  const runId = `run_ci_matrix_${Date.now()}`;
  const runResult = await runMultiViewportVerification({
    runId,
    baseUrl: 'http://localhost:4173',
    routes: [{ path: '/', type: 'page', fileSource: 'src/app/page.tsx', isDynamic: false }],
    mockBrowser: true,
  });

  assert.equal(runResult.summary.totalProfiles, 3);
  assert.equal(runResult.profileRecords.length, 3);
  assert.equal(runResult.screenshotMetadata.length, 3);
  for (const rec of runResult.profileRecords) {
    assert.ok(rec.profileId);
    assert.ok(rec.testResultIds.length > 0);
  }

  // Clean up disk artifacts
  const runArtifactsDir = `public/artifacts/runs/${runId}`;
  if (fs.existsSync(runArtifactsDir)) {
    fs.rmSync(runArtifactsDir, { recursive: true, force: true });
  }
  console.log('  [PASS] Contribution 43: Runner executed checks per profile with isolated records & screenshots.\n');

  // -------------------------------------------------------------
  // [CI - 44] Viewport Matrix Report UI & Failure Visibility
  // -------------------------------------------------------------
  console.log('[CI - 44] Verify Viewport Matrix Report UI & Failure Isolation');
  const mixedResults = [
    {
      id: 'res_desk',
      runId: 'ci_run',
      name: 'Desktop Root',
      category: 'smoke',
      status: 'passed',
      durationMs: 50,
      actualResult: 'Passed 1440x900',
      evidence: { consoleErrors: [], networkFailures: [], steps: [], viewport: { width: 1440, height: 900 } },
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    },
    {
      id: 'res_mob',
      runId: 'ci_run',
      name: 'Mobile Overflow',
      category: 'responsive_layout',
      status: 'failed',
      durationMs: 70,
      actualResult: 'Horizontal layout overflow detected at Mobile viewport (390px)',
      evidence: { consoleErrors: [], networkFailures: [], steps: [], viewport: { width: 390, height: 844 } },
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    },
  ];
  const derivedRecords = deriveViewportRecordsFromResults(mixedResults, 'ci_run');
  const dRec = derivedRecords.find((r) => r.profileId === 'desktop-1440x900');
  const mRec = derivedRecords.find((r) => r.profileId === 'mobile-390x844');
  assert.equal(dRec?.status, 'passed');
  assert.equal(mRec?.status, 'failed');
  console.log('  [PASS] Contribution 44: Failed mobile run remains visible even when desktop run succeeds.\n');

  // -------------------------------------------------------------
  // [CI - 45] Horizontal Overflow Detection
  // -------------------------------------------------------------
  console.log('[CI - 45] Verify Horizontal Overflow Detection & Intentional Carousel Exemption');
  const carouselFixture = {
    tagName: 'div',
    rect: { width: 390, right: 390 },
    children: [
      {
        tagName: 'div',
        className: 'carousel',
        rect: { width: 390, right: 390 },
        children: [{ tagName: 'div', rect: { width: 900, right: 900 } }],
      },
    ],
  };
  const carouselCheck = analyzeFixtureDomOverflow(carouselFixture, 390);
  assert.equal(carouselCheck.unexpectedOverflow, false, 'Carousel should NOT be flagged as unexpected overflow');

  const bugFixture = {
    tagName: 'div',
    rect: { width: 390, right: 390 },
    children: [{ tagName: 'div', id: 'wide-box', rect: { width: 600, right: 600 } }],
  };
  const bugCheck = analyzeFixtureDomOverflow(bugFixture, 390);
  assert.equal(bugCheck.unexpectedOverflow, true);
  assert.equal(bugCheck.offendingElements[0].overflowPx, 210);
  console.log('  [PASS] Contribution 45: Real overflow detected while approved carousels exempted.\n');

  // -------------------------------------------------------------
  // [CI - 46] Responsive Navigation Visibility & Toggle
  // -------------------------------------------------------------
  console.log('[CI - 46] Verify Responsive Navigation & Profile Attribution');
  const brokenMobileNav = {
    hasNavElement: true,
    isNavVisible: true,
    hasToggle: false, // Mobile menu button missing
    isToggleVisible: false,
    toggleCanExpand: false,
    desktopLinks: ['/', '/about'],
    mobileDrawerLinks: [],
  };
  const dNav = auditResponsiveNavigation(defaults[0], brokenMobileNav);
  const mNav = auditResponsiveNavigation(defaults[2], brokenMobileNav);
  assert.equal(dNav.passed, true);
  assert.equal(mNav.passed, false);
  assert.equal(mNav.profileId, 'mobile-390x844');
  console.log('  [PASS] Contribution 46: Broken mobile navigation attributed specifically to mobile profile.\n');

  // -------------------------------------------------------------
  // [CI - 47] Form Usability & Safe Dry-Run Submission
  // -------------------------------------------------------------
  console.log('[CI - 47] Verify Forms at Different Viewports with Safe Dry-Run');
  let blockedSubmissions = 0;
  const sampleForm = [
    {
      id: 'form1',
      action: '/submit',
      fields: [{ id: 'email', name: 'Email', type: 'email', required: true, width: 300, height: 44, isVisible: true, value: 'ok@ok.com' }],
      submitButton: { text: 'Send', width: 100, height: 44, isVisible: true },
    },
  ];
  const formAudit = verifyFormAtViewport(defaults[2], sampleForm, {
    onInterceptSubmission: () => blockedSubmissions++,
  });
  assert.equal(formAudit.passed, true);
  assert.equal(formAudit.safeSubmissionVerified, true);
  assert.equal(blockedSubmissions, 1);
  console.log('  [PASS] Contribution 47: Form verified with touch targets and safe dry-run submission.\n');

  // -------------------------------------------------------------
  // [CI - 48] Touch & Mobile Emulation Settings & Distinction
  // -------------------------------------------------------------
  console.log('[CI - 48] Verify Touch Emulation Context & Emulation Distinction');
  const emuContext = buildPlaywrightEmulationContext(defaults[2]); // Mobile
  assert.equal(emuContext.hasTouch, true);
  assert.equal(emuContext.isMobile, true);
  assert.equal(emuContext.deviceScaleFactor, 3.0);

  const distinction = generateEmulationDistinctionReport(defaults[2]);
  assert.equal(distinction.isEmulated, true);
  assert.equal(distinction.hardwareDeviceGuaranteed, false);
  assert.ok(distinction.provenByEmulation.length >= 4);
  assert.ok(distinction.cannotBeProvenByEmulation.length >= 4);
  console.log('  [PASS] Contribution 48: Touch emulation honored and distinction clearly documented.\n');

  // -------------------------------------------------------------
  // [CI - 49] Resource Limits & Partial Failure Handling
  // -------------------------------------------------------------
  console.log('[CI - 49] Verify Resource Limits, Timeouts & Partial-Failure Preservation');
  const boundedRes = await executeBoundedMatrix(
    [defaults[0], defaults[1]],
    async (profile) => {
      if (profile.id === 'tablet-768x1024') throw new Error('Simulated tablet crash');
      return {
        profileId: profile.id,
        profileName: profile.name,
        viewport: { width: profile.width, height: profile.height, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
        status: 'passed',
        durationMs: 10,
        testResultIds: [],
        screenshotPaths: [],
        emulationNotice: profile.disclaimer,
      };
    },
    { maxConcurrency: 2 }
  );
  assert.equal(boundedRes.records.find((r) => r.profileId === 'desktop-1440x900')?.status, 'passed');
  assert.equal(boundedRes.records.find((r) => r.profileId === 'tablet-768x1024')?.status, 'failed');
  console.log('  [PASS] Contribution 49: Partial failure preserved completed desktop results.\n');

  // -------------------------------------------------------------
  // [CI - 50] Multi-Device Viewport Matrix CI & Documentation
  // -------------------------------------------------------------
  console.log('[CI - 50] Verify Viewport Matrix Documentation & Artifact Integrity');
  const docsPath = path.join(process.cwd(), 'docs', 'VIEWPORT_MATRIX.md');
  assert.ok(fs.existsSync(docsPath), 'docs/VIEWPORT_MATRIX.md documentation must exist');
  const docsContent = fs.readFileSync(docsPath, 'utf-8');
  assert.ok(docsContent.includes('Multi-Device Viewport Matrix'));
  assert.ok(docsContent.includes('What Emulation Can and Cannot Prove'));
  assert.ok(docsContent.includes('Horizontal Overflow Detection'));
  console.log('  [PASS] Contribution 50: CI verified multi-viewport fixture and documentation.\n');

  console.log('===============================================================');
  console.log('  ALL 10 VIEWPORT MATRIX CONTRIBUTIONS (41-50) PASSED IN CI!  ');
  console.log('===============================================================');
}

runCiSuite().catch((err) => {
  console.error('CI Suite Failure:', err);
  process.exit(1);
});
