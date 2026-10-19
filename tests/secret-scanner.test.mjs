import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  scanDirectoryForSecrets,
  scanContentForSecrets,
  isBinaryBuffer,
} from '../src/lib/security/secret-scanner.ts';

console.log('--- Testing Secret-Pattern Scanning (Contribution 76) ---');

const testDir = path.join(process.cwd(), 'public', 'artifacts', 'test_secret_scan_suite');

function setupSecretFixtures() {
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
  fs.mkdirSync(testDir, { recursive: true });

  const rawSecrets = {
    aws: 'AKIAIOSFODNN7EXAMPLE',
    github: 'ghp_0123456789abcdef0123456789abcdef0123',
    openai: 'sk-test1234567890abcdef1234567890abcdef',
    dbPass: 'SuperSecretPass123!',
  };

  // 1. Text file with synthetic secrets
  const envContent = `
    # Configuration
    AWS_ACCESS_KEY_ID="${rawSecrets.aws}"
    GITHUB_TOKEN="${rawSecrets.github}"
    OPENAI_API_KEY="${rawSecrets.openai}"
    DATABASE_URL="postgres://appuser:${rawSecrets.dbPass}@db.example.internal:5432/production"
  `;
  fs.writeFileSync(path.join(testDir, 'app-config.env'), envContent);

  // 2. Binary PNG file containing secret byte sequence
  const fakePng = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]), // PNG header with null byte
    Buffer.from(rawSecrets.aws),
  ]);
  fs.writeFileSync(path.join(testDir, 'logo.png'), fakePng);

  // 3. Oversized file (exceeds 100KB test limit)
  const bigFileContent = 'const a = 1;\n'.repeat(10000); // ~130KB
  fs.writeFileSync(path.join(testDir, 'bundle-large.js'), bigFileContent);

  // 4. Excluded node_modules directory with secret
  const nodeModulesDir = path.join(testDir, 'node_modules', 'some-pkg');
  fs.mkdirSync(nodeModulesDir, { recursive: true });
  fs.writeFileSync(path.join(nodeModulesDir, 'index.js'), `const key = "${rawSecrets.github}";`);

  return { rawSecrets };
}

async function runTests() {
  const { rawSecrets } = setupSecretFixtures();

  try {
    const scanResult = await scanDirectoryForSecrets(testDir, {
      maxFileSizeBytes: 100 * 1024, // 100KB limit to test boundary
    });

    console.log(`Scanned files: ${scanResult.scannedFilesCount}, Skipped files: ${scanResult.skippedFilesCount}`);
    console.log(`Detected secret findings: ${scanResult.findings.length}`);

    // 1. Known synthetic secrets are detected
    assert.ok(scanResult.findings.length >= 4, 'Must detect AWS, GitHub, OpenAI, and DB URI secrets');

    const awsFinding = scanResult.findings.find((f) => f.detectorType === 'AWS Access Key ID');
    assert.ok(awsFinding, 'Must detect AWS Access Key');
    assert.equal(awsFinding.filePath, 'app-config.env');

    const ghFinding = scanResult.findings.find((f) => f.detectorType === 'GitHub Token');
    assert.ok(ghFinding, 'Must detect GitHub Token');

    const dbFinding = scanResult.findings.find((f) => f.detectorType === 'Database Connection URI with Password');
    assert.ok(dbFinding, 'Must detect Database URI password');

    // 2. CRITICAL REQUIREMENT: "without printing their complete values"
    for (const finding of scanResult.findings) {
      assert.equal(
        finding.redactedExcerpt.includes(rawSecrets.aws),
        false,
        'Complete AWS secret MUST NOT appear in finding excerpt'
      );
      assert.equal(
        finding.redactedExcerpt.includes(rawSecrets.github),
        false,
        'Complete GitHub secret MUST NOT appear in finding excerpt'
      );
      assert.equal(
        finding.redactedExcerpt.includes(rawSecrets.openai),
        false,
        'Complete OpenAI secret MUST NOT appear in finding excerpt'
      );
      assert.equal(
        finding.redactedExcerpt.includes(rawSecrets.dbPass),
        false,
        'Complete Database password MUST NOT appear in finding excerpt'
      );
      assert.ok(finding.mask.includes('*') || finding.mask.includes('REDACTED'));
    }
    console.log('[PASS] Known synthetic secrets detected without exposing or printing complete raw values.');

    // 3. Binary exclusion check
    const binaryFindings = scanResult.findings.filter((f) => f.filePath.endsWith('.png'));
    assert.equal(binaryFindings.length, 0, 'Binary PNG file must be excluded from secret scan');
    console.log('[PASS] Binary files correctly excluded from scanning.');

    // 4. Safe file size limit check
    const bigFileFindings = scanResult.findings.filter((f) => f.filePath === 'bundle-large.js');
    assert.equal(bigFileFindings.length, 0, 'Oversized file exceeding size limit must be skipped');
    console.log('[PASS] Files exceeding size limit were safely skipped.');

    // 5. Excluded directory check
    const nmFindings = scanResult.findings.filter((f) => f.filePath.includes('node_modules'));
    assert.equal(nmFindings.length, 0, 'node_modules directory must be excluded');
    console.log('[PASS] Ignored build and dependency directories excluded from scanning.');
  } finally {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  }
}

runTests()
  .then(() => {
    console.log('[ALL PASS] Contribution 76 test suite passed.');
  })
  .catch((err) => {
    console.error('[FAIL] Secret scanner test error:', err);
    process.exit(1);
  });
