import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { FilesystemJailManager } from '../src/lib/sandbox/filesystem-jail.ts';

console.log('--- Testing Ephemeral Filesystem Jail & CoW Mounter (Contribution 154) ---');

const testJailsDir = path.join(process.cwd(), '.test-jails-temp');
const mockSourceDir = path.join(process.cwd(), '.test-source-project');

if (fs.existsSync(testJailsDir)) fs.rmSync(testJailsDir, { recursive: true, force: true });
if (fs.existsSync(mockSourceDir)) fs.rmSync(mockSourceDir, { recursive: true, force: true });

fs.mkdirSync(mockSourceDir, { recursive: true });
fs.writeFileSync(path.join(mockSourceDir, 'package.json'), '{"name":"mock-app"}', 'utf8');

const jailManager = new FilesystemJailManager(testJailsDir);
const sandboxId = 'sbx-jail-test-001';

const policy = {
  readOnlyRoot: true,
  tmpfsMounts: ['/tmp', '/run'],
  maskedPaths: ['/proc/sys', '/sys'],
  copyOnWriteWorkspace: true,
  cleanupOnExit: true,
};

// 1. Initialize Jail
const manifest = await jailManager.initializeJail(sandboxId, mockSourceDir, policy);
assert.equal(manifest.sandboxId, sandboxId);
assert.equal(manifest.readOnly, true);
assert.ok(fs.existsSync(manifest.baseDir), 'Sandbox base directory should exist');
assert.ok(fs.existsSync(manifest.upperDir), 'CoW upper diff directory should exist');
assert.ok(fs.existsSync(manifest.workDir), 'CoW work directory should exist');
assert.ok(fs.existsSync(manifest.mergedDir), 'Workspace merged directory should exist');
console.log('✅ Jail directory structure and overlay scratch created');

// 2. Verify Mount Specs
const tmpMount = manifest.mounts.find((m) => m.destination === '/tmp');
assert.ok(tmpMount, '/tmp tmpfs mount should be defined');
assert.equal(tmpMount.type, 'tmpfs');
assert.ok(tmpMount.options.includes('noexec'));
assert.ok(tmpMount.options.includes('nosuid'));

const cowMount = manifest.mounts.find((m) => m.destination === '/app');
assert.ok(cowMount, '/app overlay mount should be defined');
assert.equal(cowMount.type, 'overlay');
assert.ok(cowMount.options.some((opt) => opt.startsWith('lowerdir=')));
assert.ok(cowMount.options.some((opt) => opt.startsWith('upperdir=')));
console.log('✅ OCI mount specifications generated with security flags');

// 3. Verify Masked Kernel Paths
assert.ok(manifest.maskedPaths.includes('/proc/kcore'));
assert.ok(manifest.maskedPaths.includes('/sys'));
assert.ok(manifest.maskedPaths.includes('/boot'));
console.log('✅ Critical kernel debug paths masked from jail access');

// 4. Test Path Traversal Containment
const rootJail = manifest.mergedDir;
const insidePath = path.join(rootJail, 'subfolder', 'test.js');
const outsideEscapePath = path.join(rootJail, '..', '..', 'etc', 'passwd');

assert.equal(jailManager.isPathContained(insidePath, rootJail), true, 'Nested path should be contained');
assert.equal(jailManager.isPathContained(outsideEscapePath, rootJail), false, 'Escaped path should be flagged as uncontained');
console.log('✅ Directory traversal attacks detected and rejected');

// 5. Cleanup
const cleanupOk = await jailManager.cleanupJail(sandboxId);
assert.equal(cleanupOk, true);
assert.equal(fs.existsSync(manifest.baseDir), false, 'Jail directory should be removed');
console.log('✅ Zero-leak teardown verified');

// Clean test source
if (fs.existsSync(testJailsDir)) fs.rmSync(testJailsDir, { recursive: true, force: true });
if (fs.existsSync(mockSourceDir)) fs.rmSync(mockSourceDir, { recursive: true, force: true });

console.log('✅ Contribution 154 tests passed cleanly!');
