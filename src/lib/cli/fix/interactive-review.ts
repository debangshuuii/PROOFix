/**
 * PROOFix CLI Interactive Patch Review Prompt
 * Interactive terminal prompt loop offering [y/N/diff/help] choices with colored diff preview.
 */

import { colors, symbols } from '../colors.ts';
import { createBox } from '../table.ts';
import { renderTerminalDiff } from '../diff-viewer.ts';
import { promptChoice, isInteractive } from '../prompts.ts';
import type { PatchProposal, FixReviewChoice } from '../types.ts';

export async function promptPatchReview(
  proposal: PatchProposal,
  autoApply = false
): Promise<FixReviewChoice> {
  if (autoApply) return 'y';
  if (!isInteractive()) return 'n';

  // Render review header box
  const boxLines = [
    `Target File:      ${colors.bold(colors.cyan(proposal.targetFile))}`,
    `Rationale:        ${colors.gray(proposal.rationale)}`,
    `Changes:          ${colors.green(`+${proposal.additions} additions`)}, ${colors.red(
      `-${proposal.deletions} deletions`
    )}`,
  ];

  console.log(createBox('Autonomous AI Self-Healing Patch Proposal', boxLines, { borderColor: colors.cyan }));
  console.log('');

  const choices: readonly FixReviewChoice[] = ['y', 'n', 'diff', 'help'];

  while (true) {
    const choice = await promptChoice(
      'Apply this self-healing patch to your repository?',
      choices,
      'n'
    );

    if (choice === 'diff') {
      console.log(`\n${renderTerminalDiff(proposal.unifiedDiff, { showLineNumbers: true })}\n`);
      continue;
    }

    if (choice === 'help') {
      console.log(`
  ${colors.bold('Available Options:')}
    ${colors.green('y')}    — Apply the patch immediately with automatic backup (.proofix.bak)
    ${colors.red('n')}    — Discard proposal and keep working directory unchanged
    ${colors.cyan('diff')} — Display full color-highlighted unified diff with line numbers
    ${colors.yellow('help')} — Show this guidance
`);
      continue;
    }

    return choice;
  }
}
