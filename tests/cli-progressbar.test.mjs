import test from 'node:test';
import assert from 'node:assert/strict';
import { PipelineProgressBar, VERIFICATION_STAGES } from '../src/lib/cli/progressbar.ts';
import { stripAnsi } from '../src/lib/cli/colors.ts';

test('progressbar: VERIFICATION_STAGES defines all 11 stages', () => {
  assert.equal(VERIFICATION_STAGES.length, 11);
  const stageIds = VERIFICATION_STAGES.map((s) => s.id);
  assert.ok(stageIds.includes('preflight'));
  assert.ok(stageIds.includes('visual_regression'));
  assert.ok(stageIds.includes('security_gate'));
  assert.ok(stageIds.includes('self_healing_repair'));
});

test('progressbar: renders correct stage, percentage, and log snippet', () => {
  const bar = new PipelineProgressBar(30);
  const output = bar.render({
    stageIndex: 5,
    totalStages: 11,
    stageName: 'Lighthouse Performance Audit',
    status: 'running',
    elapsedMs: 2400,
    recentLog: 'Auditing First Contentful Paint: 1.1s'
  });

  const plain = stripAnsi(output);
  assert.ok(plain.includes('Lighthouse Performance Audit'));
  assert.ok(plain.includes('[6/11]'));
  assert.ok(plain.includes('2.4s'));
  assert.ok(plain.includes('Auditing First Contentful Paint'));
});

test('progressbar: nextFrame advances frame state', () => {
  const bar = new PipelineProgressBar();
  const f1 = bar.nextFrame();
  const f2 = bar.nextFrame();
  assert.notEqual(f1, f2);
});
