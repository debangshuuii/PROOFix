import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CgroupV2Manager } from '../src/lib/sandbox/cgroup-manager.ts';

console.log('--- Testing Linux Cgroups v2 & Resource Limit Manager (Contribution 152) ---');

const testDir = path.join(process.cwd(), '.test-cgroups-temp');
if (fs.existsSync(testDir)) {
  fs.rmSync(testDir, { recursive: true, force: true });
}

const cgroupMgr = new CgroupV2Manager(testDir);
assert.equal(cgroupMgr.isSimulatedMode(), true, 'Expected test manager to run in simulated mode');

// 1. Test directive generation
const quotas = {
  memoryLimitMb: 512,
  memorySwapLimitMb: 0,
  cpuQuotaPercentage: 150, // 1.5 cores
  maxProcesses: 64,
  maxOpenFiles: 1024,
  diskQuotaMb: 1000,
  executionTimeoutSecs: 30,
};

const directives = cgroupMgr.generateDirectives(quotas);
assert.equal(directives['cpu.max'], '150000 100000', 'CPU max should equal 150000 100000 (150%)');
assert.equal(directives['memory.max'], (512 * 1024 * 1024).toString(), 'Memory limit should be 512MB in bytes');
assert.equal(directives['memory.swap.max'], '0', 'Swap should be strictly disabled');
assert.equal(directives['pids.max'], '64', 'PIDs max should equal 64');
console.log('✅ Cgroup directives generated accurately');

// 2. Test cgroup creation and file verification
const sandboxId = 'sbx-test-cgroup-001';
const manifest = await cgroupMgr.createCgroup(sandboxId, quotas);
assert.equal(manifest.sandboxId, sandboxId);
assert.ok(fs.existsSync(manifest.cgroupPath), 'Cgroup directory should exist');

const readCpuMax = fs.readFileSync(path.join(manifest.cgroupPath, 'cpu.max'), 'utf8');
assert.equal(readCpuMax, '150000 100000');

const readMemMax = fs.readFileSync(path.join(manifest.cgroupPath, 'memory.max'), 'utf8');
assert.equal(readMemMax, (512 * 1024 * 1024).toString());
console.log('✅ Cgroup control files created and verified');

// 3. Test assign PID
const assignResult = await cgroupMgr.assignPid(sandboxId, 4242);
assert.equal(assignResult, true, 'PID 4242 should be enrolled');
const procsContent = fs.readFileSync(path.join(manifest.cgroupPath, 'cgroup.procs'), 'utf8');
assert.ok(procsContent.includes('4242'), 'cgroup.procs should contain 4242');
console.log('✅ Assign PID verified');

// 4. Test Memory Events & OOM detection
const memEventsContent = `low 0
high 14
max 8
oom 1
oom_kill 1`;
const parsedEvents = cgroupMgr.parseMemoryEvents(memEventsContent);
assert.equal(parsedEvents.oom, 1);
assert.equal(parsedEvents.oomKill, 1);
assert.equal(parsedEvents.high, 14);

// Write to sandbox cgroup and detect
fs.writeFileSync(path.join(manifest.cgroupPath, 'memory.events'), memEventsContent, 'utf8');
const oomDetected = await cgroupMgr.detectOom(sandboxId);
assert.equal(oomDetected, true, 'OOM detection should return true');
console.log('✅ OOM kill detection verified');

// 5. Test metrics read
fs.writeFileSync(path.join(manifest.cgroupPath, 'memory.current'), (256 * 1024 * 1024).toString(), 'utf8');
fs.writeFileSync(path.join(manifest.cgroupPath, 'pids.current'), '12', 'utf8');
const metrics = await cgroupMgr.readMetrics(sandboxId);
assert.equal(metrics.currentMemoryUsageMb, 256);
assert.equal(metrics.activeProcessCount, 12);
console.log('✅ Sandbox metrics read verified');

// 6. Test cleanup
const cleanupOk = await cgroupMgr.cleanupCgroup(sandboxId);
assert.equal(cleanupOk, true);
assert.equal(fs.existsSync(manifest.cgroupPath), false, 'Cgroup directory should be deleted after cleanup');
console.log('✅ Cgroup cleanup verified');

// Clean temp directory
if (fs.existsSync(testDir)) {
  fs.rmSync(testDir, { recursive: true, force: true });
}

console.log('✅ Contribution 152 tests passed cleanly!');
