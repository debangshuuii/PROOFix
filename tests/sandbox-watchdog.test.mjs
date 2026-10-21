import assert from 'node:assert/strict';
import { SandboxWatchdog } from '../src/lib/sandbox/sandbox-watchdog.ts';

console.log('--- Testing Sandbox Health & OOM Watchdog (Contribution 156) ---');

const watchdog = new SandboxWatchdog();

const alerts = [];
watchdog.onAlert((alert) => alerts.push(alert));

// 1. Test Memory High Watermark & OOM Kill
const oomQuotas = {
  memoryLimitMb: 100,
  memorySwapLimitMb: 0,
  cpuQuotaPercentage: 100,
  maxProcesses: 10,
  maxOpenFiles: 1024,
  diskQuotaMb: 100,
  executionTimeoutSecs: 10,
};

let killedReason = null;
const session1 = watchdog.startWatchdog('sbx-oom-test', oomQuotas, 1234, (reason) => {
  killedReason = reason;
});

// Update metrics to 88MB (88% -> high watermark)
watchdog.updateMetrics('sbx-oom-test', { currentMemoryUsageMb: 88 });
watchdog.tickSession(session1);
assert.equal(session1.alerts.length, 1);
assert.equal(session1.alerts[0].reason, 'memory_high_watermark');
console.log('✅ Memory high watermark alert triggered');

// Update metrics to 105MB (exceeds limit -> OOM kill)
watchdog.updateMetrics('sbx-oom-test', { currentMemoryUsageMb: 105 });
watchdog.tickSession(session1, (reason) => { killedReason = reason; });
assert.equal(killedReason, 'oom_kill');
assert.equal(session1.killReason, 'oom_kill');
console.log('✅ OOM kill event triggered accurately');

// 2. Test Fork Bomb / PID limit detection
let forkKillReason = null;
const session2 = watchdog.startWatchdog('sbx-fork-test', oomQuotas, 5678, (reason) => {
  forkKillReason = reason;
});

// Update active process count to 15 (limit is 10)
watchdog.updateMetrics('sbx-fork-test', { activeProcessCount: 15 });
watchdog.tickSession(session2, (reason) => { forkKillReason = reason; });
assert.equal(forkKillReason, 'fork_bomb_pid_limit');
assert.equal(session2.killReason, 'fork_bomb_pid_limit');
console.log('✅ Fork bomb attack blocked upon exceeding PID ceiling');

// 3. Test Execution Timeout
const timeoutQuotas = {
  ...oomQuotas,
  executionTimeoutSecs: 0.05, // 50ms
};

let timeoutReason = null;
const session3 = watchdog.startWatchdog('sbx-timeout-test', timeoutQuotas, 9999, (reason) => {
  timeoutReason = reason;
});

await new Promise((r) => setTimeout(r, 120));
assert.equal(timeoutReason, 'execution_timeout');
console.log('✅ Execution timeout watchdog accurately terminates runaway execution');

console.log('✅ Contribution 156 tests passed cleanly!');
