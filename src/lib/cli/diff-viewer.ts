/**
 * PROOFix CLI Unified Diff Highlighter & Parser
 * Renders unified diffs with ANSI colors, line numbers, and addition/deletion statistics.
 */

import { colors, stripAnsi } from './colors.ts';

export interface DiffStats {
  additions: number;
  deletions: number;
  filesChanged: number;
}

export interface DiffRenderOptions {
  showLineNumbers?: boolean;
  maxLines?: number;
  showSummary?: boolean;
}

export function parseDiffStats(diffText: string): DiffStats {
  const lines = diffText.split(/\r?\n/);
  let additions = 0;
  let deletions = 0;
  const files = new Set<string>();

  for (const line of lines) {
    if (line.startsWith('+++ b/')) {
      files.add(line.replace('+++ b/', ''));
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      additions++;
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      deletions++;
    }
  }

  return {
    additions,
    deletions,
    filesChanged: Math.max(files.size, 1),
  };
}

export function renderTerminalDiff(diffText: string, options: DiffRenderOptions = {}): string {
  const showLineNumbers = options.showLineNumbers ?? true;
  const maxLines = options.maxLines ?? 100;
  const showSummary = options.showSummary ?? true;

  const rawLines = diffText.split(/\r?\n/);
  const renderedLines: string[] = [];

  let oldLine = 0;
  let newLine = 0;

  for (let i = 0; i < rawLines.length && renderedLines.length < maxLines; i++) {
    const line = rawLines[i];

    if (line.startsWith('diff --git') || line.startsWith('index ')) {
      renderedLines.push(colors.bold(colors.cyan(line)));
    } else if (line.startsWith('--- ')) {
      renderedLines.push(colors.red(colors.bold(line)));
    } else if (line.startsWith('+++ ')) {
      renderedLines.push(colors.green(colors.bold(line)));
    } else if (line.startsWith('@@')) {
      // Chunk header: @@ -oldStart,oldCount +newStart,newCount @@
      const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (match) {
        oldLine = parseInt(match[1], 10);
        newLine = parseInt(match[2], 10);
      }
      renderedLines.push(colors.cyan(line));
    } else if (line.startsWith('+')) {
      const lineNumStr = showLineNumbers ? `     ${String(newLine).padStart(4)} | ` : '';
      renderedLines.push(colors.green(`${colors.gray(lineNumStr)}${line}`));
      newLine++;
    } else if (line.startsWith('-')) {
      const lineNumStr = showLineNumbers ? `${String(oldLine).padStart(4)}      | ` : '';
      renderedLines.push(colors.red(`${colors.gray(lineNumStr)}${line}`));
      oldLine++;
    } else {
      // Context line
      const lineNumStr = showLineNumbers
        ? `${String(oldLine).padStart(4)} ${String(newLine).padStart(4)} | `
        : '';
      renderedLines.push(colors.dim(`${colors.gray(lineNumStr)}${line}`));
      oldLine++;
      newLine++;
    }
  }

  if (rawLines.length > maxLines) {
    renderedLines.push(
      colors.yellow(`... [truncated ${rawLines.length - maxLines} lines] ...`)
    );
  }

  if (showSummary) {
    const stats = parseDiffStats(diffText);
    const summary = `\n  ${colors.bold('Diff Summary:')} ${colors.green(`+${stats.additions}`)} ${colors.red(`-${stats.deletions}`)} across ${stats.filesChanged} file(s)`;
    renderedLines.push(summary);
  }

  return renderedLines.join('\n');
}
