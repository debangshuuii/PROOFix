import assert from 'assert';
import path from 'path';
import {
  resolveWorkflowConfig,
  getCategoriesForProfile,
} from '../src/action/config-resolver.ts';

console.log('--- TEST: Workflow Configuration & Profile Behavioral Adaptation ---');

// Test 1: Profile behavioral mappings
console.log('[TEST 1] Profile to category mapping changes execution behavior');
const smokeCategories = getCategoriesForProfile('smoke');
assert.deepStrictEqual(smokeCategories, ['smoke']);

const visualCategories = getCategoriesForProfile('visual');
assert.ok(visualCategories.includes('responsive_layout'));
assert.ok(visualCategories.includes('smoke'));

const fullCategories = getCategoriesForProfile('full');
assert.ok(fullCategories.length >= 6);
console.log('  -> Profiles reliably change active categories and checks.');

// Test 2: Resolve valid configuration on sample fixture
console.log('[TEST 2] Resolving configuration on valid workspace');
const config = resolveWorkflowConfig({
  projectPath: 'src/fixtures/sample-app',
  verificationProfile: 'visual',
  reportOutput: 'custom-ci-reports',
  failOnRegression: false,
  timeoutMinutes: 20,
  retries: 3,
  generateSummary: true,
  uploadArtifacts: true,
});

assert.ok(config.workspaceDir.endsWith(path.normalize('src/fixtures/sample-app')));
assert.strictEqual(config.profile, 'visual');
assert.strictEqual(config.failOnRegression, false);
assert.strictEqual(config.timeoutMs, 20 * 60 * 1000);
assert.strictEqual(config.retries, 3);
assert.ok(config.reportDirectory.endsWith('custom-ci-reports'));
assert.strictEqual(config.isCustomReportDir, true);
console.log('  -> Custom inputs successfully configured workspace and runtime parameters.');

// Test 3: Reject non-existent project directory
console.log('[TEST 3] Rejects non-existent project directory');
assert.throws(
  () => {
    resolveWorkflowConfig({
      projectPath: 'non/existent/path/definitely_not_here',
      verificationProfile: 'full',
      reportOutput: 'proofix-reports',
      failOnRegression: true,
      timeoutMinutes: 15,
      retries: 2,
      generateSummary: true,
      uploadArtifacts: true,
    });
  },
  /Specified project-path .* does not exist/,
  'Must throw on missing workspace'
);
console.log('  -> Non-existent project path safely rejected.');

// Test 4: Reject file passed as project directory
console.log('[TEST 4] Rejects file passed as directory');
assert.throws(
  () => {
    resolveWorkflowConfig({
      projectPath: 'package.json',
      verificationProfile: 'full',
      reportOutput: 'proofix-reports',
      failOnRegression: true,
      timeoutMinutes: 15,
      retries: 2,
      generateSummary: true,
      uploadArtifacts: true,
    });
  },
  /is a file, not a directory/,
  'Must reject file passed as project directory'
);
console.log('  -> File path safely rejected from being used as workspace directory.');

console.log('\n--- All Contribution 23 Workflow Config Tests Passed! ---');
