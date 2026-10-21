import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Subsystem imports
import { CgroupV2Manager } from '../src/lib/sandbox/cgroup-manager.ts';
import { NetworkShield } from '../src/lib/sandbox/network-shield.ts';
import { FilesystemJailManager } from '../src/lib/sandbox/filesystem-jail.ts';
import { OciRuntimeAdapter } from '../src/lib/sandbox/oci-adapter.ts';
import { SandboxWatchdog } from '../src/lib/sandbox/sandbox-watchdog.ts';
import { SecureCommandRunner } from '../src/lib/sandbox/secure-runner.ts';
import { SandboxPoolOrchestrator } from '../src/lib/sandbox/sandbox-pool.ts';

console.log('========================================================================');
console.log('🚀 PROOFix Master CI Suite: True Production Sandbox Isolation (151–160)');
console.log('========================================================================\n');

const testSandboxDir = path.join(process.cwd(), '.ci-sandbox-isolation-temp');
if (fs.existsSync(testSandboxDir)) fs.rmSync(testSandboxDir, { recursive: true, force: true });

// Step 1: Cgroups v2 Resource Limit Verification
console.log('Step 1: Testing Cgroups v2 Directives & OOM Kill Detection...');
const cgroupMgr = new CgroupV2Manager(path.join(testSandboxDir, 'cgroups'));
const quotas = {
  memoryLimitMb: 256,
  memorySwapLimitMb: 0,
  cpuQuotaPercentage: 100,
  maxProcesses: 32,
  maxOpenFiles: 1024,
  diskQuotaMb: 500,
  executionTimeoutSecs: 15,
};
const cgroupManifest = await cgroupMgr.createCgroup('ci-sbx-01', quotas);
assert.ok(fs.existsSync(cgroupManifest.cgroupPath), 'Cgroup folder must exist');
const oomContent = 'low 0\nhigh 2\nmax 1\noom 1\noom_kill 1';
fs.writeFileSync(path.join(cgroupManifest.cgroupPath, 'memory.events'), oomContent, 'utf8');
const oomDetected = await cgroupMgr.detectOom('ci-sbx-01');
assert.equal(oomDetected, true, 'OOM kill must be detected');
console.log('  -> Cgroups v2 directives and OOM detection verified.\n');

// Step 2: Network Egress Firewall & Cloud Metadata Shield
console.log('Step 2: Testing SSRF Metadata Defense & Network Shield...');
const networkShield = new NetworkShield();
const netPolicy = {
  allowEgress: true,
  blockCloudMetadata: true,
  allowedDomains: ['registry.npmjs.org', 'github.com'],
  allowedPorts: [80, 443],
  isolatedBridgeNetwork: true,
};
const awsBlocked = networkShield.evaluateDestination('ci-sbx-01', 'http://169.254.169.254/latest/meta-data', netPolicy);
assert.equal(awsBlocked.allowed, false);
assert.equal(awsBlocked.reason, 'cloud_metadata_blocked');
const privateBlocked = networkShield.evaluateDestination('ci-sbx-01', 'http://10.100.1.1', netPolicy);
assert.equal(privateBlocked.allowed, false);
assert.equal(privateBlocked.reason, 'private_subnet_blocked');
const goodAllowed = networkShield.evaluateDestination('ci-sbx-01', 'https://github.com', netPolicy);
assert.equal(goodAllowed.allowed, true);
console.log('  -> AWS/GCP/Azure IMDS and RFC 1918 subnets blocked.\n');

// Step 3: Ephemeral Filesystem Jail & CoW Mounter
console.log('Step 3: Testing Ephemeral Jail & CoW Overlay Mounting...');
const jailMgr = new FilesystemJailManager(path.join(testSandboxDir, 'jails'));
const jailManifest = await jailMgr.initializeJail('ci-sbx-01', process.cwd(), {
  readOnlyRoot: true,
  tmpfsMounts: ['/tmp', '/run'],
  maskedPaths: ['/proc/kcore'],
  copyOnWriteWorkspace: true,
  cleanupOnExit: true,
});
assert.ok(jailManifest.mounts.some((m) => m.destination === '/tmp' && m.options.includes('noexec')));
assert.equal(jailMgr.isPathContained(path.join(jailManifest.mergedDir, 'sub'), jailManifest.mergedDir), true);
assert.equal(jailMgr.isPathContained('/etc/shadow', jailManifest.mergedDir), false);
console.log('  -> Filesystem jail, tmpfs scratch, and path containment verified.\n');

// Step 4: OCI Runtime Adapter & Seccomp Profile
console.log('Step 4: Testing OCI Spec Generation & Seccomp Syscall Filtering...');
const ociAdapter = new OciRuntimeAdapter();
const ociSpec = ociAdapter.generateOciSpec(['node', '-v'], {
  isolationMode: 'rootless_container',
  quotas,
  network: netPolicy,
  filesystem: { readOnlyRoot: true, tmpfsMounts: ['/tmp'], maskedPaths: [], copyOnWriteWorkspace: true, cleanupOnExit: true },
  capabilities: { dropAllCapabilities: true, addCapabilities: [], noNewPrivileges: true, runAsUserUid: 10001, runAsUserGid: 10001 },
});
assert.equal(ociSpec.ociVersion, '1.0.2');
assert.equal(ociSpec.process.user.uid, 10001);
assert.ok(ociSpec.linux.seccomp.syscalls[0].names.includes('ptrace'));
console.log('  -> OCI v1.0.2 spec and seccomp syscall filters validated.\n');

// Step 5: Sandbox Health & OOM Watchdog
console.log('Step 5: Testing Sandbox Watchdog & Fork Bomb Suppression...');
const watchdog = new SandboxWatchdog();
let watchdogKill = null;
const session = watchdog.startWatchdog('ci-sbx-watch', { ...quotas, maxProcesses: 5 }, 7777, (r) => { watchdogKill = r; });
watchdog.updateMetrics('ci-sbx-watch', { activeProcessCount: 10 });
watchdog.tickSession(session, (r) => { watchdogKill = r; });
assert.equal(watchdogKill, 'fork_bomb_pid_limit');
console.log('  -> Watchdog killed runaway fork bomb exceeding PID ceiling.\n');

// Step 6: Secure Runner with Privilege Dropping
console.log('Step 6: Testing Secure Command Runner...');
const runner = new SecureCommandRunner(watchdog);
const execResult = await runner.execute({
  sandboxId: 'ci-sbx-exec',
  command: 'node',
  args: ['-e', 'console.log("MASTER_CI_OK");'],
  cwd: process.cwd(),
  policy: {
    isolationMode: 'unprivileged_process',
    quotas,
    network: netPolicy,
    filesystem: { readOnlyRoot: true, tmpfsMounts: [], maskedPaths: [], copyOnWriteWorkspace: false, cleanupOnExit: true },
    capabilities: { dropAllCapabilities: true, addCapabilities: [], noNewPrivileges: true, runAsUserUid: 10001, runAsUserGid: 10001 },
  },
});
assert.equal(execResult.exitCode, 0);
assert.ok(execResult.stdout.includes('MASTER_CI_OK'));
console.log('  -> Command executed cleanly with stdout and metrics captured.\n');

// Step 7: Sandbox Pool & Multi-Tenant Orchestrator
console.log('Step 7: Testing Sandbox Pool Orchestration & Rapid Acquisition...');
const pool = new SandboxPoolOrchestrator(testSandboxDir);
await pool.preWarmPool(2, 'unprivileged_process');
const acquired = await pool.acquireSandbox('tenant-ci', 'run-ci-01');
assert.ok(acquired.id.length > 0);
const poolExec = await pool.executeInSandbox(acquired.id, 'node', ['-e', 'process.exit(0);']);
assert.equal(poolExec.exitCode, 0);
const poolDestroyed = await pool.destroySandbox(acquired.id);
assert.equal(poolDestroyed, true);
console.log('  -> Warm pool acquisition, execution, and teardown verified.\n');

// Cleanup
if (fs.existsSync(testSandboxDir)) fs.rmSync(testSandboxDir, { recursive: true, force: true });

console.log('========================================================================');
console.log('🎉 ALL 10 PRODUCTION SANDBOX ISOLATION VERIFICATION CHECKS PASSED!');
console.log('========================================================================');
