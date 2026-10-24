/**
 * PROOFix CLI ASCII Banner & Header Formatting
 * Provides consistent branded terminal headers across all CLI subcommands.
 */

import { colors } from './colors.ts';

export const PROOFIX_VERSION = '0.1.0';

export function getAsciiBanner(subtitle?: string): string {
  const border = colors.cyan('╔════════════════════════════════════════════════════════════╗');
  const title = `║                  ${colors.bold(colors.white('PROOFix Verification CLI'))}                  ║`;
  const tagline = `║       ${colors.gray('"Don\'t just generate code. Prove that it works."')}     ║`;
  const close = colors.cyan('╚════════════════════════════════════════════════════════════╝');

  const lines = [border, title, tagline, close];

  if (subtitle) {
    lines.push(`  ${colors.dim('•')} ${colors.bold(colors.cyan(subtitle))} ${colors.gray(`(v${PROOFIX_VERSION})`)}\n`);
  } else {
    lines.push(`  ${colors.gray(`Version ${PROOFIX_VERSION}`)}\n`);
  }

  return lines.join('\n');
}

export function printBanner(subtitle?: string): void {
  console.log(getAsciiBanner(subtitle));
}
