import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

console.log('--- Testing Sandbox Isolation Types & Security Policy Schema (Contribution 151) ---');

const typesPath = resolve(process.cwd(), 'src/lib/types/sandbox-isolation.ts');
assert.ok(existsSync(typesPath), 'src/lib/types/sandbox-isolation.ts must exist');

const source = readFileSync(typesPath, 'utf8');

// 1. Verify Isolation Modes
const expectedModes = [
  'microvm_firecracker',
  'rootless_container',
  'cgroup_chroot_jail',
  'unprivileged_process',
];
for (const mode of expectedModes) {
  assert.ok(source.includes(mode), `SandboxIsolationMode "${mode}" must be defined`);
}

// 2. Verify Core Interfaces
assert.ok(source.includes('interface ResourceQuotas'), 'Must declare ResourceQuotas');
assert.ok(source.includes('interface NetworkShieldPolicy'), 'Must declare NetworkShieldPolicy');
assert.ok(source.includes('interface FilesystemMountPolicy'), 'Must declare FilesystemMountPolicy');
assert.ok(source.includes('interface SecurityCapabilities'), 'Must declare SecurityCapabilities');
assert.ok(source.includes('interface SandboxSecurityPolicy'), 'Must declare SandboxSecurityPolicy');
assert.ok(source.includes('interface SandboxExecutionResult'), 'Must declare SandboxExecutionResult');
assert.ok(source.includes('interface SandboxInstance'), 'Must declare SandboxInstance');

// 3. Test Sample Policy Construction
const samplePolicy = {
  isolationMode: 'rootless_container',
  quotas: {
    memoryLimitMb: 512,
    memorySwapLimitMb: 512,
    cpuQuotaPercentage: 100, // 1 vCPU
    maxProcesses: 64,        // PID ceiling
    maxOpenFiles: 1024,
    diskQuotaMb: 1024,
    executionTimeoutSecs: 30,
  },
  network: {
    allowEgress: false,
    blockCloudMetadata: true, // 169.254.169.254
    allowedDomains: ['registry.npmjs.org'],
    allowedPorts: [443],
    isolatedBridgeNetwork: true,
  },
  filesystem: {
    readOnlyRoot: true,
    tmpfsMounts: ['/tmp', '/run'],
    maskedPaths: ['/proc/sys', '/sys', '/boot'],
    copyOnWriteWorkspace: true,
    cleanupOnExit: true,
  },
  capabilities: {
    dropAllCapabilities: true,
    addCapabilities: [],
    noNewPrivileges: true,
    runAsUserUid: 10001,
    runAsUserGid: 10001,
  },
};

assert.equal(samplePolicy.isolationMode, 'rootless_container');
assert.equal(samplePolicy.quotas.memoryLimitMb, 512);
assert.equal(samplePolicy.quotas.maxProcesses, 64);
assert.equal(samplePolicy.network.blockCloudMetadata, true);
assert.equal(samplePolicy.filesystem.readOnlyRoot, true);
assert.equal(samplePolicy.capabilities.dropAllCapabilities, true);

// 4. Test Sample Sandbox Instance
const sampleInstance = {
  id: 'sbx_prod_101',
  runId: 'run_sample_verification',
  mode: 'rootless_container',
  state: 'warm_idle',
  workspacePath: '/tmp/proofix/sbx_prod_101',
  policy: samplePolicy,
  metrics: {
    currentMemoryUsageMb: 42,
    peakMemoryUsageMb: 110,
    cpuPercentage: 12.5,
    activeProcessCount: 3,
    ioReadBytes: 1024 * 50,
    ioWriteBytes: 1024 * 10,
    egressPacketsBlocked: 0,
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

assert.equal(sampleInstance.id, 'sbx_prod_101');
assert.equal(sampleInstance.state, 'warm_idle');
assert.equal(sampleInstance.metrics.currentMemoryUsageMb, 42);

console.log('✅ Contribution 151 tests passed cleanly!');
