/**
 * PROOFix CLI Interactive Terminal Prompts
 * Safe user prompt primitives with TTY fallback for non-interactive / CI execution.
 */

import readline from 'readline';
import { colors } from './colors.ts';

export function isInteractive(): boolean {
  if (process.env.CI || process.env.NON_INTERACTIVE === 'true') return false;
  return Boolean(process.stdin && process.stdin.isTTY && process.stdout && process.stdout.isTTY);
}

export async function promptChoice<T extends string>(
  question: string,
  validChoices: readonly T[],
  defaultChoice: T
): Promise<T> {
  if (!isInteractive()) {
    return defaultChoice;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    const formattedChoices = validChoices
      .map((c) => (c === defaultChoice ? c.toUpperCase() : c.toLowerCase()))
      .join('/');

    const query = `${question} ${colors.cyan(`[${formattedChoices}]`)} `;

    rl.question(query, (answer) => {
      rl.close();
      const trimmed = answer.trim().toLowerCase();
      if (!trimmed) {
        return resolve(defaultChoice);
      }

      const match = validChoices.find((c) => c.toLowerCase() === trimmed);
      if (match) {
        return resolve(match);
      }

      // If unrecognized, return default
      resolve(defaultChoice);
    });
  });
}

export async function promptConfirm(question: string, defaultChoice = false): Promise<boolean> {
  const choices: readonly ['y', 'n'] = ['y', 'n'];
  const def = defaultChoice ? 'y' : 'n';
  const res = await promptChoice(question, choices, def);
  return res === 'y';
}

export async function promptInput(question: string, defaultValue = ''): Promise<string> {
  if (!isInteractive()) return defaultValue;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    const hint = defaultValue ? ` ${colors.gray(`(${defaultValue})`)}` : '';
    rl.question(`${question}${hint}: `, (answer) => {
      rl.close();
      const trimmed = answer.trim();
      resolve(trimmed || defaultValue);
    });
  });
}

export function listenKeyPress(callback: (char: string, key: readline.Key) => void): () => void {
  if (!process.stdin.isTTY) {
    return () => {};
  }

  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.setRawMode) {
    process.stdin.setRawMode(true);
  }
  process.stdin.resume();

  const handler = (ch: string, key: readline.Key) => {
    if (key.ctrl && key.name === 'c') {
      process.exit(0);
    }
    callback(ch, key);
  };

  process.stdin.on('keypress', handler);

  return () => {
    process.stdin.removeListener('keypress', handler);
    if (process.stdin.setRawMode) {
      process.stdin.setRawMode(false);
    }
    process.stdin.pause();
  };
}
