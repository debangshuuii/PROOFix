import test from 'node:test';
import assert from 'node:assert/strict';
import { getProposalForScenario, applyPatch, rollbackPatch } from '../src/lib/cli/fix/patcher.ts';

test('patcher: getProposalForScenario generates valid proposal with stats', () => {
  const proposal = getProposalForScenario('ecommerce_checkout');
  assert.ok(proposal);
  assert.equal(proposal.scenarioId, 'ecommerce_checkout');
  assert.ok(proposal.unifiedDiff.includes('diff') || proposal.unifiedDiff.includes('+++'));
  assert.ok(proposal.additions >= 0);
  assert.ok(proposal.rationale.length > 5);
});

test('patcher: applyPatch in mock mode returns success and backup path', () => {
  const proposal = getProposalForScenario('ecommerce_checkout');
  assert.ok(proposal);

  const res = applyPatch(proposal, true);
  assert.equal(res.success, true);
  assert.ok(res.backupPath?.includes('.proofix.bak'));
});

test('patcher: rollbackPatch in mock mode restores state cleanly', () => {
  const res = rollbackPatch('ecommerce_checkout', true);
  assert.equal(res.success, true);
  assert.ok(res.message.includes('rolled back'));
});

test('patcher: returns null for non-existent scenario', () => {
  const proposal = getProposalForScenario('non_existent_xyz');
  assert.equal(proposal, null);
});
