import assert from 'node:assert/strict';
import { DistributedLockManager } from '../src/lib/queue/distributed-lock.ts';

console.log('--- Testing Distributed Locks with Auto-Renewing Leases (Contribution 166) ---');

const lockMgr = new DistributedLockManager();
const testKey = 'resource:run-e2e-cluster';

// 1. Acquire Lock & Fencing Token
const leaseA = await lockMgr.acquire(testKey, { ttlMs: 1000 });
assert.ok(leaseA);
assert.equal(leaseA.lockKey, testKey);
assert.ok(leaseA.fencingToken > 1000, 'Fencing token should be generated');
assert.equal(lockMgr.isLocked(testKey), true);
console.log(`✅ Lock acquired with fencing token ${leaseA.fencingToken}`);

// 2. Mutual Exclusion Check
const leaseB = await lockMgr.acquire(testKey, { ttlMs: 1000, maxRetries: 0 });
assert.equal(leaseB, null, 'Second client must not acquire an active lock');
console.log('✅ Mutual exclusion enforced: conflicting acquire rejected');

// 3. Safe Release
const releaseOk = await lockMgr.release(leaseA);
assert.equal(releaseOk, true);
assert.equal(lockMgr.isLocked(testKey), false);
console.log('✅ Lock successfully released');

// 4. Next acquire gets higher fencing token
const leaseC = await lockMgr.acquire(testKey, { ttlMs: 1000 });
assert.ok(leaseC);
assert.ok(leaseC.fencingToken > leaseA.fencingToken, 'Subsequent fencing token must be strictly greater');
await lockMgr.release(leaseC);
console.log('✅ Monotonic fencing token progression verified');

// 5. withLock scoped execution
let criticalSectionExecuted = false;
const result = await lockMgr.withLock(testKey, { ttlMs: 1000 }, async (lease) => {
  assert.equal(lockMgr.isLocked(testKey), true);
  criticalSectionExecuted = true;
  return `PROCESSED_WITH_${lease.fencingToken}`;
});

assert.equal(criticalSectionExecuted, true);
assert.ok(result.startsWith('PROCESSED_WITH_'));
assert.equal(lockMgr.isLocked(testKey), false, 'Lock must be released automatically after withLock block');
console.log('✅ withLock scoped wrapper verified');

console.log('✅ Contribution 166 tests passed cleanly!');
