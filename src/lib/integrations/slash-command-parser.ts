/**
 * Pull Request Slash Command Parser
 * Parses `/proofix fix`, `/proofix heal`, `/proofix prove`, `/proofix budget`, and `/proofix help`.
 */

import type { ParsedSlashCommand, PrSlashCommandType } from '../types/pr-bot.ts';

export class SlashCommandParser {
  /**
   * Evaluates whether a comment contains a PROOFix slash command.
   */
  public isSlashCommand(commentBody: string): boolean {
    if (!commentBody) return false;
    const trimmed = commentBody.trim();
    return trimmed.startsWith('/proofix') || trimmed.startsWith('proofix:');
  }

  /**
   * Parses the raw comment into a structured command object.
   */
  public parseComment(
    commentBody: string,
    metadata?: {
      author?: string;
      commentId?: number;
      pullRequestNumber?: number;
    }
  ): ParsedSlashCommand {
    const raw = (commentBody || '').trim();
    const commentAuthor = metadata?.author || 'unknown';
    const commentId = metadata?.commentId || 0;
    const pullRequestNumber = metadata?.pullRequestNumber || 0;

    if (!this.isSlashCommand(raw)) {
      return {
        command: 'unknown',
        args: [],
        rawText: raw,
        commentAuthor,
        commentId,
        pullRequestNumber,
        isValid: false,
      };
    }

    // Extract first line or command token
    const lines = raw.split('\n');
    const commandLine = lines[0].trim();
    const tokens = commandLine.split(/\s+/);

    // E.g. ['/proofix', 'fix', '--apply'] or ['/proofix:fix']
    let subCommand = 'help';
    let args: string[] = [];

    if (tokens[0].includes(':')) {
      const parts = tokens[0].split(':');
      subCommand = parts[1]?.toLowerCase() || 'help';
      args = tokens.slice(1);
    } else if (tokens.length >= 2) {
      subCommand = tokens[1].toLowerCase();
      args = tokens.slice(2);
    }

    let command: PrSlashCommandType = 'unknown';
    if (subCommand === 'fix') command = 'fix';
    else if (subCommand === 'heal') command = 'heal';
    else if (subCommand === 'prove') command = 'prove';
    else if (subCommand === 'budget' || subCommand === 'vitals') command = 'budget';
    else if (subCommand === 'help') command = 'help';

    const isValid = command !== 'unknown';

    return {
      command,
      args,
      rawText: raw,
      commentAuthor,
      commentId,
      pullRequestNumber,
      isValid,
    };
  }

  /**
   * Generates a helpful usage response for invalid commands or `/proofix help`.
   */
  public formatHelpMessage(): string {
    return `
### 🤖 PROOFix Bot Command Reference

PROOFix listens for comments on this Pull Request to automate verification, performance auditing, and self-repair:

| Command | Action |
| :--- | :--- |
| \`/proofix fix\` or \`/proofix heal\` | **Autonomous Self-Healing:** Commits the AI-diagnosed bug fix patch directly to this PR branch. |
| \`/proofix prove\` | **Dual-Pass Verification:** Executes the Shadow Prover and issues a cryptographic SHA-256 Proof Certificate. |
| \`/proofix budget\` | **Performance Audit:** Re-evaluates Core Web Vitals (LCP, CLS, TTFB) against deployment budgets. |
| \`/proofix help\` | Displays this interactive command cheatsheet. |

> _Tip: You can also click the **1-Click Apply** link in the verification summary above to apply fixes interactively._
`.trim();
  }
}

export const globalSlashCommandParser = new SlashCommandParser();
