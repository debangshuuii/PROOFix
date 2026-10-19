import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runHardenedSecurityPreflight } from '../src/lib/security/scanner-hardening.ts';
import { assertZeroSecretLeakage } from '../src/lib/security/secret-redaction.ts';

console.log('--- Testing Scanner Hardening, Timeouts & Consent (Contribution 79) ---');

const testDir = path.join(process.cwd(), 'public', 'artifacts', 'test_hardening_fixtures');

function setupFixtures() {
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
  fs.mkdirSync(testDir, { recursive: true });

  const rawSecret = 'ghp_secretTokenThatMustNeverLeakUnderTimeout1234';

  fs.writeFileSync(path.join(testDir, 'package.json'), JSON.stringify({
    name: 'hardened-test-app',
    dependencies: {
      lodash: '4.17.15',
      express: '4.18.2',
    },
  }, null, 2));

  fs.writeFileSync(path.join(testDir, 'secret-config.js'), `const token = "${rawSecret}";`);

  return { rawSecret };
}

async function runTests() {
  const { rawSecret } = setupFixtures();

  try {
    // 1. Test timeout handling
    // "timeouts and external-service failures are handled safely without leaking source or credentials."
    const timeoutResult = await runHardenedSecurityPreflight(testDir, 'proj_timeout', {
      timeoutMs: 50,
      simulateTimeout: true,
    });

    assert.equal(timeoutResult.timedOut, true, 'Scanner must flag timedOut as true');
    assert.ok(timeoutResult.errors.some((e) => e.includes('timed out')), 'Error list must record timeout');
    assert.ok(timeoutResult.report.gateEvaluation.isIncomplete, 'Timed out scan must be marked incomplete');

    // Assert zero secret leakage during timeout failure
    const leakCheck = assertZeroSecretLeakage(timeoutResult, [rawSecret]);
    assert.equal(leakCheck.isClean, true, 'Timeout failure MUST NOT leak raw secret into error message or report');
    console.log('[PASS] Scanner execution timeout handled safely with zero secret leakage.');

    // 2. Test explicit consent for external network queries
    // "explicit consent for any source or metadata sent to external services."
    const noConsentResult = await runHardenedSecurityPreflight(testDir, 'proj_no_consent', {
      timeoutMs: 5000,
      consentExternalNetworkLookup: false, // Explicitly no consent
    });

    assert.equal(noConsentResult.externalNetworkUsed, false);
    assert.equal(noConsentResult.timedOut, false);
    console.log('[PASS] Without explicit consent, external network lookups remain strictly disabled.');

    const consentResult = await runHardenedSecurityPreflight(testDir, 'proj_consent', {
      timeoutMs: 5000,
      consentExternalNetworkLookup: true, // Consent granted
    });
    assert.equal(consentResult.externalNetworkUsed, true);
    console.log('[PASS] Explicit consent correctly enables external metadata lookups.');

    // 3. Test resource bounds
    const boundedResult = await runHardenedSecurityPreflight(testDir, 'proj_bounded', {
      maxDependencies: 1, // Limit to 1 dependency
    });
    assert.equal(boundedResult.resourceLimitsExceeded, true);
    assert.ok(boundedResult.errors.some((e) => e.includes('exceeded maximum limit')));
    console.log('[PASS] Resource limits enforce maximum dependencies scanned and prevent exhaustion.');

    // 4. Test safe temporary storage cleanup
    const customScratch = path.join(testDir, 'custom_scratch');
    await runHardenedSecurityPreflight(testDir, 'proj_clean_scratch', {
      scratchBaseDir: customScratch,
    });

    const residualFiles = fs.existsSync(customScratch) ? fs.readdirSync(customScratch) : [];
    assert.equal(residualFiles.length, 0, 'Temporary scratch directories must be cleaned up in finally block');
    console.log('[PASS] Safe temporary scratch storage cleaned up properly after scan.');
  } finally {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  }
}

runTests()
  .then(() => {
    console.log('[ALL PASS] Contribution 79 test suite passed.');
  })
  .catch((err) => {
    console.error('[FAIL] Scanner hardening test failed:', err);
    process.exit(1);
  });
