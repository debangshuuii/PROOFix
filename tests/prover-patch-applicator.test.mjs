import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { AtomicPatchApplicator } from '../src/lib/prover/patch-applicator.ts';

console.log('[TEST] AtomicPatchApplicator');
const dir = 'd:/Coding/PROOFix/.proofix-shadow/patch-test';
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'app.js'), 'const a = 1;');

const res = AtomicPatchApplicator.applyToShadow(dir, 'app.js', 'const a = 2;');
assert.strictEqual(res.success, true);
assert.strictEqual(fs.readFileSync(path.join(dir, 'app.js'), 'utf-8'), 'const a = 2;');

AtomicPatchApplicator.rollback(path.join(dir, 'app.js'), res.backupPath);
assert.strictEqual(fs.readFileSync(path.join(dir, 'app.js'), 'utf-8'), 'const a = 1;');

fs.rmSync(dir, { recursive: true, force: true });
console.log('✓ AtomicPatchApplicator test passed.');
