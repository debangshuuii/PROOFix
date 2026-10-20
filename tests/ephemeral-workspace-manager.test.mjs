import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import {
  createEphemeralWorkspace,
  createWorkspaceSnapshot,
  rollbackWorkspace,
  cleanupEphemeralWorkspace,
} from '../src/lib/repair/ephemeral-workspace.ts';

console.log('--- Testing Ephemeral Sandbox Workspace Manager (Contribution 4 / 104) ---');

async function testWorkspaceLifecycleAndRollback() {
  // Create a dummy source fixture directory
  const fixtureDir = path.join(process.cwd(), 'scratch', 'test_source_app');
  fs.mkdirSync(fixtureDir, { recursive: true });
  fs.writeFileSync(path.join(fixtureDir, 'index.html'), '<h1>Original Source</h1>', 'utf8');

  // Add dummy node_modules to ensure exclusion filter works
  const dummyModules = path.join(fixtureDir, 'node_modules', 'dummy');
  fs.mkdirSync(dummyModules, { recursive: true });
  fs.writeFileSync(path.join(dummyModules, 'index.js'), 'console.log("dep");', 'utf8');

  let workspace;
  try {
    // 1. Create Ephemeral Workspace
    workspace = await createEphemeralWorkspace(fixtureDir, 'test_run_104');
    assert.ok(fs.existsSync(workspace.workspacePath));
    assert.ok(fs.existsSync(path.join(workspace.workspacePath, 'index.html')));
    assert.equal(fs.existsSync(path.join(workspace.workspacePath, 'node_modules')), false, 'node_modules must be excluded');
    console.log('[PASS] Ephemeral workspace created and exclusions filtered successfully.');

    // 2. Snapshot & Rollback Existing File
    const snapshot = createWorkspaceSnapshot(workspace.workspacePath, ['index.html']);
    assert.equal(snapshot.files.get('index.html'), '<h1>Original Source</h1>');

    // Mutate file in workspace
    fs.writeFileSync(path.join(workspace.workspacePath, 'index.html'), '<h1>Patched Broken Content</h1>', 'utf8');
    assert.equal(fs.readFileSync(path.join(workspace.workspacePath, 'index.html'), 'utf8'), '<h1>Patched Broken Content</h1>');

    // Perform rollback
    rollbackWorkspace(workspace.workspacePath, snapshot);
    assert.equal(fs.readFileSync(path.join(workspace.workspacePath, 'index.html'), 'utf8'), '<h1>Original Source</h1>');
    console.log('[PASS] Snapshot rollback restored modified file to original content.');

    // 3. Rollback Newly Created File
    const newFileSnapshot = createWorkspaceSnapshot(workspace.workspacePath, ['new_route.tsx']);
    assert.equal(newFileSnapshot.files.get('new_route.tsx'), '');

    fs.writeFileSync(path.join(workspace.workspacePath, 'new_route.tsx'), 'export default function New() {}', 'utf8');
    assert.ok(fs.existsSync(path.join(workspace.workspacePath, 'new_route.tsx')));

    rollbackWorkspace(workspace.workspacePath, newFileSnapshot);
    assert.equal(fs.existsSync(path.join(workspace.workspacePath, 'new_route.tsx')), false, 'Newly added file must be deleted on rollback');
    console.log('[PASS] Rollback cleanly removed newly introduced file.');

    // 4. Source Immutability Assertion
    const sourceContent = fs.readFileSync(path.join(fixtureDir, 'index.html'), 'utf8');
    assert.equal(sourceContent, '<h1>Original Source</h1>', 'Source repository must remain completely immutable');
    console.log('[PASS] Source repository immutability guaranteed.');
  } finally {
    if (workspace) {
      await cleanupEphemeralWorkspace(workspace.workspacePath);
      assert.equal(fs.existsSync(workspace.workspacePath), false);
      console.log('[PASS] Ephemeral workspace directory cleaned up cleanly from disk.');
    }
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  }
}

async function runSuite() {
  await testWorkspaceLifecycleAndRollback();
  console.log('[ALL PASS] Contribution 4 (104) test suite passed.');
}

runSuite().catch((err) => {
  console.error('[FAIL] Workspace manager test error:', err);
  process.exit(1);
});
