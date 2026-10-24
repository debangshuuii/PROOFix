import test from 'node:test';
import assert from 'node:assert/strict';
import { StreamingReporter } from '../src/lib/cli/runner/streaming-reporter.ts';

test('reporter: tracks stage start, log, and completion events', () => {
  const reporter = new StreamingReporter({ interactive: false, quiet: true });

  reporter.onStageStart('preflight', 0, 11, 'Preflight Static Analysis');
  reporter.onStageLog('preflight', 'Validating TS syntax and lint constraints');
  reporter.onStageComplete('preflight', 'passed', 120, 'Zero syntax errors detected');

  const events = reporter.getEvents();
  assert.equal(events.length, 1);
  assert.equal(events[0].stageId, 'preflight');
  assert.equal(events[0].status, 'passed');
  assert.equal(events[0].elapsedMs, 120);
  assert.equal(events[0].log, 'Zero syntax errors detected');
});

test('reporter: manages multiple sequence stages', () => {
  const reporter = new StreamingReporter({ interactive: false, quiet: true });

  reporter.onStageStart('mock_replay', 1, 11, 'Mock Contract Replay');
  reporter.onStageComplete('mock_replay', 'passed', 45);

  reporter.onStageStart('action_simulation', 2, 11, 'Action Journey Simulation');
  reporter.onStageComplete('action_simulation', 'failed', 230, 'Checkout form failed to submit');

  const events = reporter.getEvents();
  assert.equal(events.length, 2);
  assert.equal(events[0].status, 'passed');
  assert.equal(events[1].status, 'failed');
});
