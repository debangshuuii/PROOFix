/**
 * PROOFix CLI: `proofix fix` Command Handler
 * Handles patch review, --apply instant patching, and --rollback restoration.
 */

import { printBanner } from '../banner.ts';
import { colors, symbols, badge } from '../colors.ts';
import { getProposalForScenario, applyPatch, rollbackPatch } from '../fix/patcher.ts';
import { promptPatchReview } from '../fix/interactive-review.ts';
import type { CliFixOptions, PatchApplyResult } from '../types.ts';

export async function executeFixCommand(options: CliFixOptions = {}): Promise<PatchApplyResult> {
  const isJson = options.json ?? false;
  const scenarioId = options.scenario || 'ecommerce_checkout';

  // Handle Rollback
  if (options.rollback) {
    if (!isJson) {
      printBanner('Autonomous Patch Rollback');
      console.log(`  Target: ${colors.bold(colors.yellow(scenarioId))}\n`);
    }

    const rollbackRes = rollbackPatch(scenarioId);
    if (isJson) {
      console.log(JSON.stringify(rollbackRes, null, 2));
      return rollbackRes;
    }

    if (rollbackRes.success) {
      console.log(`  ${colors.green(symbols.tick)} ${colors.bold('Rollback Complete:')} ${rollbackRes.message}\n`);
    } else {
      console.log(`  ${colors.red(symbols.cross)} ${colors.bold('Rollback Failed:')} ${rollbackRes.message}\n`);
    }
    return rollbackRes;
  }

  // Handle Fix Review & Apply
  const proposal = getProposalForScenario(scenarioId);
  if (!proposal) {
    const errorResult: PatchApplyResult = {
      success: false,
      targetFile: '',
      message: `No active fix proposal found for scenario '${scenarioId}'.`,
    };
    if (isJson) {
      console.log(JSON.stringify(errorResult, null, 2));
    } else {
      console.error(`\n  ${colors.red(symbols.cross)} ${errorResult.message}\n`);
    }
    return errorResult;
  }

  if (!isJson) {
    printBanner('Autonomous AI Patch Review');
  }

  const choice = await promptPatchReview(proposal, Boolean(options.apply));

  if (choice !== 'y') {
    const abortedResult: PatchApplyResult = {
      success: false,
      targetFile: proposal.targetFile,
      message: 'Patch application declined by user.',
    };
    if (isJson) {
      console.log(JSON.stringify(abortedResult, null, 2));
    } else {
      console.log(`  ${colors.yellow(symbols.warn)} Patch application aborted.\n`);
    }
    return abortedResult;
  }

  // Apply the patch
  const applyRes = applyPatch(proposal);

  if (isJson) {
    console.log(JSON.stringify(applyRes, null, 2));
    return applyRes;
  }

  if (applyRes.success) {
    console.log(`\n  ${badge('PATCH APPLIED', 'green')}`);
    console.log(`  ${colors.green(symbols.tick)} ${colors.bold(applyRes.message)}`);
    console.log(`  Backup saved: ${colors.gray(applyRes.backupPath || '')}`);
    console.log(
      `\n  ${colors.cyan(symbols.arrow)} Next step: Run ${colors.bold(
        colors.green(`npx proofix run --scenario ${scenarioId}`)
      )} to verify pipeline fix!\n`
    );
  } else {
    console.log(`\n  ${badge('PATCH FAILED', 'red')}`);
    console.log(`  ${colors.red(symbols.cross)} ${applyRes.message}\n`);
  }

  return applyRes;
}
