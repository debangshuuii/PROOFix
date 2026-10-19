import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  parsePackageJson,
  parsePackageLockJson,
  parseRequirementsTxt,
  generateDependencyInventory,
} from '../src/lib/security/dependency-inventory.ts';

console.log('--- Testing Dependency Inventory Generation (Contribution 72) ---');

const testDir = path.join(process.cwd(), 'public', 'artifacts', 'test_inventory_fixtures');

function setupTestFixtures() {
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
  fs.mkdirSync(testDir, { recursive: true });

  // 1. Valid npm lockfile fixture
  const npmLockfileContent = JSON.stringify({
    name: 'test-app',
    version: '1.0.0',
    lockfileVersion: 3,
    packages: {
      '': {
        name: 'test-app',
        dependencies: {
          'next': '^14.2.0',
          'react': '^18.2.0',
        },
        devDependencies: {
          'typescript': '^5.0.0',
        },
      },
      'node_modules/next': {
        version: '14.2.0',
        dependencies: {
          'styled-jsx': '5.1.1',
        },
      },
      'node_modules/react': {
        version: '18.2.0',
      },
      'node_modules/typescript': {
        version: '5.4.5',
        dev: true,
      },
      'node_modules/styled-jsx': {
        version: '5.1.1',
      },
    },
  }, null, 2);

  // 2. Valid python requirements fixture
  const pythonReqContent = `
    # Core dependencies
    fastapi==0.110.0
    uvicorn>=0.28.0
    pydantic~=2.6.4
    # Development
    pytest==8.1.1
  `;

  // 3. Malformed JSON lockfile
  const malformedLockContent = '{"name": "broken-lock", "packages": { UNTERMINATED_JSON';

  return { npmLockfileContent, pythonReqContent, malformedLockContent };
}

async function runTests() {
  const fixtures = setupTestFixtures();

  try {
    // 1. Test parsing valid package-lock.json fixture
    const lockResult = parsePackageLockJson(fixtures.npmLockfileContent, 'package-lock.json');
    assert.equal(lockResult.errors.length, 0, 'Valid lockfile should have 0 errors');
    assert.equal(lockResult.items.length, 4, 'Must extract next, react, typescript, styled-jsx');

    const nextDep = lockResult.items.find((d) => d.name === 'next');
    assert.ok(nextDep);
    assert.equal(nextDep.version, '14.2.0');
    assert.equal(nextDep.type, 'direct');
    assert.equal(nextDep.ecosystem, 'npm');

    const tsDep = lockResult.items.find((d) => d.name === 'typescript');
    assert.ok(tsDep);
    assert.equal(tsDep.version, '5.4.5');
    assert.equal(tsDep.type, 'dev');

    const transitiveDep = lockResult.items.find((d) => d.name === 'styled-jsx');
    assert.ok(transitiveDep);
    assert.equal(transitiveDep.version, '5.1.1');
    assert.equal(transitiveDep.type, 'transitive');

    console.log('[PASS] Package-lock.json parsed into accurate inventory matching lockfile fixture.');

    // 2. Test parsing requirements.txt fixture
    const reqResult = parseRequirementsTxt(fixtures.pythonReqContent, 'requirements.txt');
    assert.equal(reqResult.errors.length, 0);
    assert.equal(reqResult.items.length, 4);

    const fastapi = reqResult.items.find((d) => d.name === 'fastapi');
    assert.ok(fastapi);
    assert.equal(fastapi.version, '0.110.0');
    assert.equal(fastapi.ecosystem, 'pypi');
    assert.equal(fastapi.type, 'direct');
    console.log('[PASS] Python requirements.txt parsed statically with exact versions.');

    // 3. Test malformed lockfile fails safely without crashing
    const malformedResult = parsePackageLockJson(fixtures.malformedLockContent, 'bad-lock.json');
    assert.equal(malformedResult.items.length, 0);
    assert.equal(malformedResult.errors.length, 1);
    assert.ok(malformedResult.errors[0].includes('Malformed lockfile'));
    console.log(`[PASS] Malformed lockfile failed safely with observable error: "${malformedResult.errors[0]}"`);

    // 4. Test directory inventory generator on full fixture
    const fixtureDir = path.join(testDir, 'full_app');
    fs.mkdirSync(fixtureDir, { recursive: true });
    fs.writeFileSync(path.join(fixtureDir, 'package.json'), JSON.stringify({
      dependencies: { lodash: '4.17.21' },
      devDependencies: { mocha: '10.0.0' },
    }));
    fs.writeFileSync(path.join(fixtureDir, 'package-lock.json'), fixtures.npmLockfileContent);

    const inventory = await generateDependencyInventory(fixtureDir);
    assert.equal(inventory.ecosystems.includes('npm'), true);
    assert.ok(inventory.totalDependencies >= 4);
    assert.equal(inventory.directCount >= 2, true);
    assert.equal(inventory.devCount >= 1, true);
    assert.ok(inventory.generatedAt);
    console.log(`[PASS] Full inventory generated: ${inventory.totalDependencies} dependencies (${inventory.directCount} direct, ${inventory.devCount} dev, ${inventory.transitiveCount} transitive).`);
  } finally {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  }
}

runTests()
  .then(() => {
    console.log('[ALL PASS] Contribution 72 test suite passed.');
  })
  .catch((err) => {
    console.error('[FAIL] Dependency inventory test error:', err);
    process.exit(1);
  });
