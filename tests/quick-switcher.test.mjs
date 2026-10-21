import assert from 'node:assert/strict';
import { QuickSwitcherProvider } from '../src/lib/navigation/quick-switcher.ts';

console.log('--- Testing Enterprise Quick-Switcher & Deep Link Provider (Contribution 185) ---');

const switcher = new QuickSwitcherProvider();

// 1. Test Deep Link Resolution
const runLink = switcher.resolveDeepLink({
  resourceType: 'test_run',
  resourceId: 'run-alpha-42',
  projectId: 'proj-ecommerce',
});
assert.equal(runLink, '/projects/proj-ecommerce/runs/run-alpha-42');

const sbxLink = switcher.resolveDeepLink({
  resourceType: 'sandbox',
  resourceId: 'sbx-prod-001',
});
assert.equal(sbxLink, '/sandbox?focus=sbx-prod-001');

const dlqLink = switcher.resolveDeepLink({
  resourceType: 'dlq_job',
  resourceId: 'dlq_job_998',
});
assert.equal(dlqLink, '/queue?tab=dlq&jobId=dlq_job_998');
console.log('✅ Canonical deep links resolved correctly');

// 2. Test Sandbox Action Generation
const sbxActions = switcher.generateSandboxActions(['sbx-01', 'sbx-02']);
assert.equal(sbxActions.length, 2);
assert.equal(sbxActions[0].id, 'switch-sbx-sbx-01');
assert.equal(sbxActions[0].category, 'enterprise');
assert.ok(sbxActions[0].href.includes('sbx-01'));
console.log('✅ Dynamic sandbox quick-switch actions generated');

// 3. Test DLQ Action Generation
const dlqActions = switcher.generateDlqActions([
  { id: 'dlq-42', queueName: 'playwright-runs', reason: 'Browser timeout' },
]);
assert.equal(dlqActions.length, 1);
assert.equal(dlqActions[0].id, 'switch-dlq-dlq-42');
assert.equal(dlqActions[0].badge, 'DLQ Redrive');
console.log('✅ DLQ quick-switch actions generated');

console.log('✅ Contribution 185 tests passed cleanly!');
