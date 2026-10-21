import test from 'node:test';
import assert from 'node:assert/strict';
import { globalChaosMonkeyCrawler } from '../src/lib/crawler/chaos-monkey-crawler.ts';

test('Chaos Monkey crawler session completes and returns structured report for API endpoint', async () => {
  const report = await globalChaosMonkeyCrawler.runAutonomousSession({
    seedUrl: 'https://staging.test.dev',
    maxPages: 2,
    randomPayloadsEnabled: true,
  });

  assert.ok(report.sessionId.startsWith('chaos-session-'));
  assert.equal(report.status, 'completed');
  assert.equal(report.seedUrl, 'https://staging.test.dev');
  assert.equal(report.graphNodes.length, 2);
  assert.ok(report.totalActionsExecuted >= 1);
});
