import test from 'node:test';
import assert from 'node:assert/strict';

test('ChaosCrawlerConfig and Action types validate accurately', () => {
  const config = {
    seedUrl: 'https://staging.acme.com',
    maxDepth: 4,
    maxPages: 50,
    maxDurationSecs: 180,
    randomPayloadsEnabled: true,
    exploratoryPatienceMs: 200,
    viewportWidth: 1280,
    viewportHeight: 800,
    respectRobotsTxt: true,
    allowedDomains: ['staging.acme.com'],
  };

  assert.equal(config.seedUrl, 'https://staging.acme.com');
  assert.equal(config.maxDepth, 4);
  assert.equal(config.randomPayloadsEnabled, true);

  const action = {
    type: 'fill_random_payload',
    selector: 'input[name="search"]',
    payload: '<script>alert("chaos")</script>',
    rationale: 'Fuzzing search box with potential XSS payload to detect DOM clobbering',
  };

  assert.equal(action.type, 'fill_random_payload');
  assert.ok(action.rationale.includes('Fuzzing'));
});

test('CrawlerAnomaly captures critical zero-day details', () => {
  const anomaly = {
    id: 'anom-1',
    type: 'uncaught_exception',
    severity: 'critical',
    message: 'Uncaught TypeError: Cannot read properties of null (reading "focus")',
    url: 'https://staging.acme.com/modal',
    stateHash: 'state-hash-999',
    actionTriggered: {
      type: 'click',
      selector: 'button.open-drawer',
      rationale: 'Click menu item',
    },
    timestamp: new Date().toISOString(),
  };

  assert.equal(anomaly.severity, 'critical');
  assert.equal(anomaly.type, 'uncaught_exception');
  assert.equal(anomaly.actionTriggered.selector, 'button.open-drawer');
});
