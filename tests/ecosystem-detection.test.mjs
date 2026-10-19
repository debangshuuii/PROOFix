import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { detectPackageEcosystems } from '../src/lib/security/ecosystem-detector.ts';

console.log('--- Testing Ecosystem Detection (Contribution 71) ---');

const testWorkspaceDir = path.join(process.cwd(), 'public', 'artifacts', 'test_ecosystem_fixture');

function setupFixtures() {
  if (fs.existsSync(testWorkspaceDir)) {
    fs.rmSync(testWorkspaceDir, { recursive: true, force: true });
  }
  fs.mkdirSync(testWorkspaceDir, { recursive: true });

  // 1. Python fixture
  const pythonDir = path.join(testWorkspaceDir, 'python_project');
  fs.mkdirSync(pythonDir, { recursive: true });
  fs.writeFileSync(path.join(pythonDir, 'pyproject.toml'), '[tool.poetry]\nname = "demo-api"\nversion = "0.1.0"');
  fs.writeFileSync(path.join(pythonDir, 'poetry.lock'), '# poetry lockfile');

  // 2. Unsupported Rust Cargo & Java Maven fixture
  const unsupportedDir = path.join(testWorkspaceDir, 'unsupported_project');
  fs.mkdirSync(unsupportedDir, { recursive: true });
  fs.writeFileSync(path.join(unsupportedDir, 'Cargo.toml'), '[package]\nname = "rust-service"');
  fs.writeFileSync(path.join(unsupportedDir, 'pom.xml'), '<project></project>');

  // 3. Empty directory
  const emptyDir = path.join(testWorkspaceDir, 'empty_repo');
  fs.mkdirSync(emptyDir, { recursive: true });

  return { pythonDir, unsupportedDir, emptyDir };
}

async function runTests() {
  const fixtures = setupFixtures();

  try {
    // 1. Test detection on real npm fixture (sample-app)
    const npmFixturePath = path.join(process.cwd(), 'src', 'fixtures', 'sample-app');
    const npmResult = detectPackageEcosystems(npmFixturePath);

    assert.equal(npmResult.hasManifests, true, 'npm fixture must have manifests');
    assert.equal(npmResult.missingManifests, false);
    const npmEcosystem = npmResult.ecosystems.find((e) => e.ecosystem === 'npm');
    assert.ok(npmEcosystem, 'Must detect npm ecosystem');
    assert.equal(npmEcosystem.manifestFile, 'package.json');
    assert.equal(npmEcosystem.supported, true);
    console.log(`[PASS] Detected npm ecosystem on sample fixture: ${npmResult.summary}`);

    // 2. Test Python ecosystem detection
    const pyResult = detectPackageEcosystems(fixtures.pythonDir);
    assert.equal(pyResult.hasManifests, true);
    const pyEcosystem = pyResult.ecosystems.find((e) => e.ecosystem === 'pypi');
    assert.ok(pyEcosystem, 'Must detect pypi ecosystem');
    assert.equal(pyEcosystem.manifestFile, 'pyproject.toml');
    assert.equal(pyEcosystem.lockfileName, 'poetry.lock');
    assert.equal(pyEcosystem.packageManager, 'poetry');
    console.log(`[PASS] Detected Python ecosystem with poetry.lock: ${pyResult.summary}`);

    // 3. Test unsupported manifests detection
    const unsuppResult = detectPackageEcosystems(fixtures.unsupportedDir);
    assert.equal(unsuppResult.hasManifests, false, 'Unsupported project has no supported manifests');
    assert.equal(unsuppResult.missingManifests, false, 'Manifests exist but are unsupported');
    assert.equal(unsuppResult.unsupportedManifests.length, 2);
    assert.ok(unsuppResult.unsupportedManifests.some((m) => m.includes('Cargo.toml (Rust / Cargo)')));
    assert.ok(unsuppResult.unsupportedManifests.some((m) => m.includes('pom.xml (Java / Maven)')));
    console.log(`[PASS] Accurately detected and reported unsupported manifests: ${unsuppResult.unsupportedManifests.join(', ')}`);

    // 4. Test missing manifests on empty repository
    const emptyResult = detectPackageEcosystems(fixtures.emptyDir);
    assert.equal(emptyResult.hasManifests, false);
    assert.equal(emptyResult.missingManifests, true, 'Missing manifests flag must be true for empty repository');
    assert.equal(emptyResult.ecosystems.length, 0);
    assert.equal(emptyResult.unsupportedManifests.length, 0);
    assert.ok(emptyResult.summary.includes('No package manifests'));
    console.log(`[PASS] Missing manifests reported accurately: ${emptyResult.summary}`);
  } finally {
    if (fs.existsSync(testWorkspaceDir)) {
      fs.rmSync(testWorkspaceDir, { recursive: true, force: true });
    }
  }
}

runTests()
  .then(() => {
    console.log('[ALL PASS] Contribution 71 test suite passed.');
  })
  .catch((err) => {
    console.error('[FAIL] Ecosystem detection test error:', err);
    process.exit(1);
  });
