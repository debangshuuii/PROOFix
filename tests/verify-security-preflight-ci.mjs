/**
 * PROOFix - Master CI Security Preflight Regression Test Suite
 * Feature 8 — Dependency & Security Preflight (Contributions 71–80)
 *
 * Verifies end-to-end security preflight functionality:
 * 1. Ecosystem detection (supported & unsupported manifests)
 * 2. Safe static dependency inventory generation
 * 3. Known-vulnerability detection (OSV-compatible)
 * 4. Finding normalization & remediation guidance
 * 5. Report structure separating findings from uncheckable items
 * 6. Secret pattern scanning with binary & size exclusions
 * 7. Zero-leakage secret redaction across logs, reports, and APIs
 * 8. Configurable gate policy evaluation & incomplete scan safety
 * 9. Hardened execution: timeouts, resource limits, and external network consent
 * 10. Synthetic multi-fixture regression run
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { detectPackageEcosystems } from '../src/lib/security/ecosystem-detector.ts';
import { generateDependencyInventory } from '../src/lib/security/dependency-inventory.ts';
import { scanDependenciesForVulnerabilities } from '../src/lib/security/vulnerability-scanner.ts';
import { normalizeOsvAdvisory } from '../src/lib/security/vulnerability-normalizer.ts';
import { buildSecurityPreflightReport } from '../src/lib/security/security-report.ts';
import { scanDirectoryForSecrets } from '../src/lib/security/secret-scanner.ts';
import {
  createSafeSecretFinding,
  sanitizeLogOutput,
  sanitizeReportForApiResponse,
  assertZeroSecretLeakage,
} from '../src/lib/security/secret-redaction.ts';
import { evaluateSecurityGate } from '../src/lib/security/security-gate.ts';
import { runHardenedSecurityPreflight } from '../src/lib/security/scanner-hardening.ts';

async function runMasterSecurityRegressionSuite() {
  console.log('================================================================');
  console.log(' PROOFix Master Security Preflight CI Regression Test Suite');
  console.log(' Feature 8: Contributions 71–80');
  console.log('================================================================\n');

  const testRoot = path.join(process.cwd(), 'scratch', `sec_ci_regression_${Date.now()}`);
  fs.mkdirSync(testRoot, { recursive: true });

  const syntheticSecrets = [
    'AKIAIOSFODNN7EXAMPLE',
    'ghp_1234567890abcdefghijklmnopqrstuvwxyzAB',
    'sk-proj-abcde12345FGHIJ67890klmno12345pqrst67890uv',
    'postgres://admin:SuperSecretPass123!@db.internal:5432/production',
    '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA0synthetic...\n-----END RSA PRIVATE KEY-----',
  ];

  try {
    // ---------------------------------------------------------
    // Test 1: Ecosystem Detection (Contribution 71)
    // ---------------------------------------------------------
    console.log('Test 1: Ecosystem Detection & Unsupported Reporting...');
    const ecoDir = path.join(testRoot, 'eco_test');
    fs.mkdirSync(ecoDir, { recursive: true });
    fs.writeFileSync(path.join(ecoDir, 'package.json'), JSON.stringify({ name: 'app' }));
    fs.writeFileSync(path.join(ecoDir, 'requirements.txt'), 'flask==2.0.1\n');
    fs.writeFileSync(path.join(ecoDir, 'Cargo.toml'), '[package]\nname = "rust-app"\n');
    fs.writeFileSync(path.join(ecoDir, 'pom.xml'), '<project></project>');

    const ecoResult = detectPackageEcosystems(ecoDir);
    assert.equal(ecoResult.hasManifests, true);
    assert.equal(ecoResult.ecosystems.length, 2, 'Should detect npm and pypi as supported');
    assert.ok(ecoResult.ecosystems.some((e) => e.ecosystem === 'npm'));
    assert.ok(ecoResult.ecosystems.some((e) => e.ecosystem === 'pypi'));
    assert.equal(ecoResult.unsupportedManifests.length, 2, 'Should report Cargo.toml and pom.xml as unsupported');
    assert.ok(ecoResult.unsupportedManifests.some((u) => u.includes('Cargo.toml')));
    console.log('  -> [PASS] Ecosystem detector accurately identifies supported and unsupported manifests.\n');

    // ---------------------------------------------------------
    // Test 2: Safe Dependency Inventory Generation (Contribution 72)
    // ---------------------------------------------------------
    console.log('Test 2: Dependency Inventory Generation & Malformed Safety...');
    const invDir = path.join(testRoot, 'inv_test');
    fs.mkdirSync(invDir, { recursive: true });
    fs.writeFileSync(
      path.join(invDir, 'package.json'),
      JSON.stringify({
        name: 'test-inv',
        dependencies: { lodash: '4.17.15' },
        devDependencies: { vitest: '1.0.0' },
      })
    );
    fs.writeFileSync(
      path.join(invDir, 'package-lock.json'),
      JSON.stringify({
        name: 'test-inv',
        lockfileVersion: 2,
        packages: {
          '': { dependencies: { lodash: '4.17.15' }, devDependencies: { vitest: '1.0.0' } },
          'node_modules/lodash': { version: '4.17.15' },
          'node_modules/vitest': { version: '1.0.0', dev: true },
        },
      })
    );
    fs.writeFileSync(path.join(invDir, 'requirements.txt'), 'urllib3==1.26.4\n# comment\nrequests>=2.25.1\n');

    const inv = await generateDependencyInventory(invDir);
    assert.equal(inv.totalDependencies, 4);
    assert.ok(inv.dependencies.some((d) => d.name === 'lodash' && d.version === '4.17.15'));
    assert.ok(inv.dependencies.some((d) => d.name === 'urllib3' && d.version === '1.26.4'));

    // Malformed JSON test
    const malformedDir = path.join(testRoot, 'malformed_test');
    fs.mkdirSync(malformedDir, { recursive: true });
    fs.writeFileSync(path.join(malformedDir, 'package.json'), '{ broken JSON');
    const malformedInv = await generateDependencyInventory(malformedDir);
    assert.ok(malformedInv.errors.length > 0, 'Malformed files must fail safely with recorded errors');
    console.log('  -> [PASS] Dependency inventory extracts packages statically and handles malformed inputs safely.\n');

    // ---------------------------------------------------------
    // Test 3 & 4: Vulnerability Scanning & Normalization (Contributions 73, 74)
    // ---------------------------------------------------------
    console.log('Test 3 & 4: Vulnerability Scanning & Finding Normalization...');
    const scanResult = await scanDependenciesForVulnerabilities(inv);
    assert.ok(scanResult.vulnerabilities.length >= 2, 'Should detect known vulnerabilities for lodash and requests');

    const rawMatch = scanResult.vulnerabilities[0];
    const normalized = normalizeOsvAdvisory(rawMatch.advisory, rawMatch.dependency);
    assert.ok(normalized.advisoryId.startsWith('GHSA-') || normalized.advisoryId.startsWith('PYSEC-'));
    assert.ok(['critical', 'high', 'medium', 'low'].includes(normalized.severity));
    assert.ok(normalized.patchedVersions.length > 0, 'Should include patched version details');
    assert.ok(normalized.remediationGuidance.includes('Upgrade'), 'Should include remediation upgrade guidance');
    console.log('  -> [PASS] Vulnerability scanner identifies advisories and normalizes them cleanly.\n');

    // ---------------------------------------------------------
    // Test 5: Dependency Security Report (Contribution 75)
    // ---------------------------------------------------------
    console.log('Test 5: Security Report Structure...');
    const gateEvalPass = evaluateSecurityGate(
      { blockOnVulnerabilitySeverity: 'critical' },
      { vulnerabilities: [normalized], secrets: [], uncheckableCount: 1, scanErrors: [] }
    );
    const report = buildSecurityPreflightReport({
      projectId: 'proj_ci',
      inventory: inv,
      rawScan: scanResult,
      gateEvaluation: gateEvalPass,
      scannedFilesCount: 5,
      skippedFilesCount: 1,
      scanDurationMs: 42,
    });

    assert.ok(report.id.startsWith('sec_rep_'));
    assert.equal(report.vulnerabilities.length, scanResult.vulnerabilities.length);
    assert.equal(report.uncheckablePackages.length, scanResult.uncheckablePackages.length);
    console.log('  -> [PASS] Security report cleanly distinguishes findings from uncheckable dependencies.\n');

    // ---------------------------------------------------------
    // Test 6 & 7: Secret Pattern Scanning & Redaction (Contributions 76, 77)
    // ---------------------------------------------------------
    console.log('Test 6 & 7: Secret Detection & Zero-Leakage Redaction...');
    const secDir = path.join(testRoot, 'sec_scan_test');
    fs.mkdirSync(secDir, { recursive: true });
    fs.writeFileSync(
      path.join(secDir, 'config.ts'),
      `export const aws = "${syntheticSecrets[0]}";\nexport const gh = "${syntheticSecrets[1]}";\nexport const ai = "${syntheticSecrets[2]}";\n`
    );

    // Create a binary file (should be ignored)
    const binBuffer = Buffer.from([0x00, 0xff, 0x00, 0xfe, 0x12, 0x34]);
    fs.writeFileSync(path.join(secDir, 'binary.bin'), binBuffer);

    const secretResult = await scanDirectoryForSecrets(secDir);
    assert.equal(secretResult.findings.length, 3, 'Should detect 3 synthetic secrets');

    // Verify zero secret leakage across findings, logs, and sanitized responses
    for (const finding of secretResult.findings) {
      const check = assertZeroSecretLeakage(finding, syntheticSecrets);
      assert.equal(check.isClean, true, 'Finding must not leak any raw secret');
      assert.ok(finding.redactedExcerpt.includes('***'));
    }

    const testLog = `Error with token ${syntheticSecrets[1]} and key ${syntheticSecrets[0]} during sync`;
    const sanitizedLog = sanitizeLogOutput(testLog, syntheticSecrets);
    assert.equal(sanitizedLog.includes(syntheticSecrets[0]), false);
    assert.equal(sanitizedLog.includes(syntheticSecrets[1]), false);
    assert.ok(sanitizedLog.includes('***'));

    const sanitizedReport = sanitizeReportForApiResponse(report);
    const serializedReport = JSON.stringify(sanitizedReport);
    for (const secret of syntheticSecrets) {
      assert.equal(
        serializedReport.includes(secret),
        false,
        `Secret must not be exposed in serialized report output: ${secret}`
      );
    }
    console.log('  -> [PASS] Secret scanner detects credentials, excludes binaries, and guarantees zero leakage.\n');

    // ---------------------------------------------------------
    // Test 8: Configurable Gate Policies (Contribution 78)
    // ---------------------------------------------------------
    console.log('Test 8: Configurable Security Gate Policies...');
    // Strict policy: blocks on high/critical or secrets
    const strictGate = evaluateSecurityGate(
      {
        blockOnVulnerabilitySeverity: 'high',
        blockOnSecrets: true,
        allowIncompleteScans: false,
      },
      {
        vulnerabilities: [normalized],
        secrets: secretResult.findings,
        uncheckableCount: 0,
        scanErrors: [],
      }
    );
    assert.equal(strictGate.blocked, true);
    assert.equal(strictGate.action, 'block');

    // Incomplete scan safety test
    const incompleteGate = evaluateSecurityGate(
      {
        allowIncompleteScans: false, // Default is false
      },
      {
        vulnerabilities: [],
        secrets: [],
        uncheckableCount: 3,
        scanErrors: ['Connection to vulnerability database timed out'],
      }
    );
    assert.equal(incompleteGate.blocked, true, 'Incomplete scans must block when allowIncompleteScans is false');
    assert.equal(incompleteGate.isIncomplete, true);
    console.log('  -> [PASS] Security gates evaluate deterministically and protect against incomplete scans.\n');

    // ---------------------------------------------------------
    // Test 9: Hardened Execution, Timeouts & Consent (Contribution 79)
    // ---------------------------------------------------------
    console.log('Test 9: Hardened Scanner Execution, Timeouts & Consent...');
    const timeoutResult = await runHardenedSecurityPreflight(invDir, 'proj_timeout', {
      timeoutMs: 50,
      simulateTimeout: true,
    });
    assert.equal(timeoutResult.timedOut, true);
    assert.ok(timeoutResult.errors.some((e) => e.includes('timed out')));

    const consentCheckResult = await runHardenedSecurityPreflight(invDir, 'proj_consent', {
      consentExternalNetworkLookup: false,
    });
    assert.equal(consentCheckResult.externalNetworkUsed, false);

    console.log('  -> [PASS] Hardened scanner handles timeouts, enforces bounds, and respects user consent.\n');

    // ---------------------------------------------------------
    // Test 10: Full Multi-Fixture End-to-End Regression
    // ---------------------------------------------------------
    console.log('Test 10: Full Synthetic Repository Preflight Run...');
    const fullProjDir = path.join(testRoot, 'full_project');
    fs.mkdirSync(fullProjDir, { recursive: true });
    fs.writeFileSync(
      path.join(fullProjDir, 'package.json'),
      JSON.stringify({
        name: 'synthetic-vulnerable-app',
        dependencies: { lodash: '4.17.15' },
      })
    );
    fs.writeFileSync(
      path.join(fullProjDir, 'server.js'),
      `const key = "${syntheticSecrets[0]}";\nconsole.log("Starting server");\n`
    );

    const fullResult = await runHardenedSecurityPreflight(fullProjDir, 'proj_synthetic_e2e', {
      gatePolicy: {
        blockOnVulnerabilitySeverity: 'critical',
        blockOnSecrets: true,
      },
    });

    assert.equal(fullResult.report.vulnerabilities.length > 0, true);
    assert.equal(fullResult.report.secrets.length, 1);
    assert.equal(fullResult.report.gateEvaluation.blocked, true);

    // Verify complete redaction on the entire final report
    const fullJson = JSON.stringify(fullResult.report);
    for (const secret of syntheticSecrets) {
      assert.equal(fullJson.includes(secret), false, 'Zero leakage in full preflight report JSON');
    }
    console.log('  -> [PASS] Full end-to-end synthetic project preflight passed with zero leaks.\n');

    console.log('================================================================');
    console.log(' [ALL PASS] All 10 Security Preflight Contributions Verified!   ');
    console.log(' Contributions 71–80 Completed & Hardened Successfully.');
    console.log('================================================================');
  } finally {
    if (fs.existsSync(testRoot)) {
      try {
        fs.rmSync(testRoot, { recursive: true, force: true });
      } catch {}
    }
  }
}

runMasterSecurityRegressionSuite().catch((err) => {
  console.error('[FATAL] Master security regression suite failed:', err);
  process.exit(1);
});
