import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ChaosMonkeyCrawler,
  globalChaosMonkeyCrawler,
} from '../src/lib/crawler/chaos-monkey-crawler.ts';

test('simulateCrawlStep analyzes DOM and generates planned action', async () => {
  const crawler = new ChaosMonkeyCrawler();
  const html = '<nav><a href="/docs">Docs</a></nav><input type="text" name="username" />';

  const { action, node } = await crawler.simulateCrawlStep(
    'https://proofix.dev/test',
    html,
    0,
    { randomPayloadsEnabled: true }
  );

  assert.ok(node);
  assert.equal(node.url, 'https://proofix.dev/test');
  assert.equal(action.type, 'fill_random_payload');
  assert.equal(action.selector, 'input[name="username"]');
});

test('runAutonomousSession completes multi-page exploratory journey with anomaly report', async () => {
  const crawler = new ChaosMonkeyCrawler();
  const report = await crawler.runAutonomousSession({
    seedUrl: 'https://demo.proofix.dev',
    maxPages: 3,
  });

  assert.equal(report.status, 'completed');
  assert.equal(report.seedUrl, 'https://demo.proofix.dev');
  assert.equal(report.graphNodes.length, 3);
  assert.equal(report.graphEdges.length, 2);
  assert.ok(report.anomalies.length >= 1);
  assert.equal(report.anomalies[0].type, 'layout_overflow');
});
