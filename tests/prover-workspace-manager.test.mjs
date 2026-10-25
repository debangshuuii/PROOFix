import assert from 'node:assert';
import fs from 'node:fs';
import { ShadowWorkspaceManager } from '../src/lib/prover/shadow-workspace-manager.ts';

console.log('[TEST] ShadowWorkspaceManager');
const mgr = new ShadowWorkspaceManager();
const wsPath = mgr.createShadowWorkspace({ baseDirectory: 'd:/Coding/PROOFix' });

assert(fs.existsSync(wsPath));
assert(wsPath.includes('.proofix-shadow'));

const cleaned = mgr.cleanup(wsPath);
assert.strictEqual(cleaned, true);
assert(!fs.existsSync(wsPath));
console.log('✓ ShadowWorkspaceManager test passed.');
