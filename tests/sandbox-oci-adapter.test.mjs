import assert from 'node:assert/strict';
import { OciRuntimeAdapter, BLOCKED_DANGEROUS_SYSCALLS } from '../src/lib/sandbox/oci-adapter.ts';

console.log('--- Testing Container & MicroVM OCI Runtime Adapter (Contribution 155) ---');

const adapter = new OciRuntimeAdapter();

const policy = {
  isolationMode: 'rootless_container',
  quotas: {
    memoryLimitMb: 512,
    memorySwapLimitMb: 0,
    cpuQuotaPercentage: 150,
    maxProcesses: 32,
    maxOpenFiles: 1024,
    diskQuotaMb: 500,
    executionTimeoutSecs: 30,
  },
  network: {
    allowEgress: false,
    blockCloudMetadata: true,
    allowedDomains: [],
    allowedPorts: [],
    isolatedBridgeNetwork: true,
  },
  filesystem: {
    readOnlyRoot: true,
    tmpfsMounts: ['/tmp'],
    maskedPaths: ['/proc/kcore', '/proc/sys'],
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

// 1. Test OCI Spec Generation
const ociSpec = adapter.generateOciSpec(['node', 'test.js'], policy);
assert.equal(ociSpec.ociVersion, '1.0.2');
assert.equal(ociSpec.process.user.uid, 10001);
assert.equal(ociSpec.process.user.gid, 10001);
assert.equal(ociSpec.process.noNewPrivileges, true);
assert.equal(ociSpec.root.readonly, true);
assert.deepEqual(ociSpec.process.capabilities.bounding, []);
console.log('✅ OCI process credentials, capabilities, and readonly root verified');

// 2. Test Linux Namespaces & Cgroups Quotas in Spec
assert.ok(ociSpec.linux.namespaces.some((ns) => ns.type === 'pid'));
assert.ok(ociSpec.linux.namespaces.some((ns) => ns.type === 'network'));
assert.ok(ociSpec.linux.namespaces.some((ns) => ns.type === 'user'));
assert.equal(ociSpec.linux.resources.memory.limit, 512 * 1024 * 1024);
assert.equal(ociSpec.linux.resources.memory.swap, 0);
assert.equal(ociSpec.linux.resources.cpu.quota, 150000);
assert.equal(ociSpec.linux.resources.pids.limit, 32);
console.log('✅ Linux namespaces and cgroups resource limits integrated into OCI spec');

// 3. Test Seccomp Syscall Filtering
const seccompBlock = ociSpec.linux.seccomp;
assert.ok(seccompBlock, 'Seccomp configuration should be present');
assert.equal(seccompBlock.defaultAction, 'SCMP_ACT_ALLOW');
const blockedCalls = seccompBlock.syscalls[0].names;
assert.ok(blockedCalls.includes('ptrace'), 'Seccomp must block ptrace');
assert.ok(blockedCalls.includes('bpf'), 'Seccomp must block bpf');
assert.ok(blockedCalls.includes('reboot'), 'Seccomp must block reboot');
assert.ok(blockedCalls.includes('sys_chroot'), 'Seccomp must block sys_chroot');
console.log('✅ Seccomp syscall filter verified with dangerous syscall denial list');

// 4. Test Podman CLI Arguments Synthesis
const podmanCli = adapter.generateCliArgs(
  'rootless_container',
  'sbx-123',
  '/data/workspace',
  'npm test',
  policy.quotas,
  policy.capabilities
);
assert.equal(podmanCli.binary, 'podman');
assert.ok(podmanCli.args.includes('--memory=512m'));
assert.ok(podmanCli.args.includes('--memory-swap=0'));
assert.ok(podmanCli.args.includes('--cap-drop=ALL'));
assert.ok(podmanCli.args.includes('--security-opt=no-new-privileges'));
assert.ok(podmanCli.args.includes('--user=10001:10001'));
assert.ok(podmanCli.args.includes('--network=none'));
console.log('✅ Rootless Podman/Docker CLI invocation flags synthesized correctly');

// 5. Test MicroVM Firecracker CLI Arguments
const microvmCli = adapter.generateCliArgs(
  'microvm_firecracker',
  'sbx-456',
  '/data/vms',
  'run',
  policy.quotas,
  policy.capabilities
);
assert.equal(microvmCli.binary, 'firecracker');
assert.ok(microvmCli.args.includes('--api-sock'));
console.log('✅ MicroVM Firecracker CLI arguments synthesized correctly');

console.log('✅ Contribution 155 tests passed cleanly!');
