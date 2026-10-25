import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { ShadowWorkspaceCloner } from '../src/lib/prover/cloner.ts';

console.log('[TEST] ShadowWorkspaceCloner');
const src = 'd:/Coding/PROOFix/.proofix-shadow/test-src';
const dst = 'd:/Coding/PROOFix/.proofix-shadow/test-dst';
fs.mkdirSync(src, { recursive: true });
fs.writeFileSync(path.join(src, 'test.txt'), 'hello');

ShadowWorkspaceCloner.cloneDirectory(src, dst);
assert(fs.existsSync(path.join(dst, 'test.txt')));

fs.rmSync(src, { recursive: true, force: true });
fs.rmSync(dst, { recursive: true, force: true });
console.log('✓ ShadowWorkspaceCloner test passed.');
