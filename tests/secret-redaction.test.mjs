import assert from 'node:assert/strict';
import {
  createSafeSecretFinding,
  sanitizeLogOutput,
  sanitizeReportForApiResponse,
  assertZeroSecretLeakage,
} from '../src/lib/security/secret-redaction.ts';
import { renderSecurityReportMarkdown } from '../src/lib/security/security-report.ts';

console.log('--- Testing Secret Redaction & Metadata Privacy (Contribution 77) ---');

const syntheticSecrets = [
  'ghp_abcdef0123456789abcdef0123456789abcd',
  'AKIAIOSFODNN7EXAMPLE',
  'sk-live-0987654321fedcba0987654321fedcba',
];

function testFindingMetadataWithoutRawSecret() {
  const finding = createSafeSecretFinding({
    detectorType: 'GitHub Token',
    filePath: 'src/config/keys.ts',
    lineNumber: 14,
    columnNumber: 5,
    rawLine: `const token = "${syntheticSecrets[0]}";`,
    rawSecret: syntheticSecrets[0],
  });

  // Verify finding metadata fields:
  // "Record file, line, detector type, and a redacted excerpt where safe."
  assert.equal(finding.filePath, 'src/config/keys.ts');
  assert.equal(finding.lineNumber, 14);
  assert.equal(finding.columnNumber, 5);
  assert.equal(finding.detectorType, 'GitHub Token');
  assert.ok(finding.redactedExcerpt.includes('ghp_'));
  assert.ok(finding.redactedExcerpt.includes('***'));

  // Ensure RAW SECRET is strictly NOT in the finding object
  const check = assertZeroSecretLeakage(finding, syntheticSecrets);
  assert.equal(check.isClean, true, 'Finding object must NOT contain any unmasked raw secret');
  console.log('[PASS] Secret finding metadata recorded with file, line, type, and redacted excerpt.');
}

function testLogSanitization() {
  const dirtyLog = `[Runner] Loaded configuration with API key: ${syntheticSecrets[1]} and token ${syntheticSecrets[0]}`;
  const cleanLog = sanitizeLogOutput(dirtyLog, syntheticSecrets);

  assert.equal(cleanLog.includes(syntheticSecrets[0]), false);
  assert.equal(cleanLog.includes(syntheticSecrets[1]), false);
  assert.ok(cleanLog.includes('AKIA****'));
  console.log('[PASS] Log output sanitization prevents credential exposure in terminal logs.');
}

function testApiAndReportZeroExposure() {
  const sampleReport = {
    id: 'rep_100',
    projectId: 'proj_demo',
    gateEvaluation: {
      passed: false,
      blocked: true,
      action: 'block',
      reasons: ['Secret detected'],
      isIncomplete: false,
      totalVulnerabilities: 0,
      blockingVulnerabilitiesCount: 0,
      totalSecrets: 1,
      blockingSecretsCount: 1,
      evaluatedAt: new Date().toISOString(),
    },
    inventory: {
      rootPath: '/app',
      ecosystems: ['npm'],
      totalDependencies: 0,
      directCount: 0,
      devCount: 0,
      transitiveCount: 0,
      dependencies: [],
      errors: [],
      generatedAt: new Date().toISOString(),
    },
    vulnerabilities: [],
    secrets: [
      createSafeSecretFinding({
        detectorType: 'OpenAI API Key',
        filePath: 'server.js',
        lineNumber: 42,
        rawLine: `apiKey: "${syntheticSecrets[2]}"`,
        rawSecret: syntheticSecrets[2],
      }),
    ],
    uncheckablePackages: [],
    scannedFilesCount: 1,
    skippedFilesCount: 0,
    scanDurationMs: 50,
    createdAt: new Date().toISOString(),
  };

  // 1. API serialization check
  const apiResponse = sanitizeReportForApiResponse(sampleReport);
  const apiCheck = assertZeroSecretLeakage(apiResponse, syntheticSecrets);
  assert.equal(apiCheck.isClean, true, 'API response must never expose raw credential values');

  // 2. Report markdown check
  const markdown = renderSecurityReportMarkdown(apiResponse);
  const mdCheck = assertZeroSecretLeakage(markdown, syntheticSecrets);
  assert.equal(mdCheck.isClean, true, 'Rendered report markdown must never expose raw credentials');

  console.log('[PASS] API responses, reports, and logs verified with zero raw credential exposure.');
}

testFindingMetadataWithoutRawSecret();
testLogSanitization();
testApiAndReportZeroExposure();

console.log('[ALL PASS] Contribution 77 test suite passed.');
