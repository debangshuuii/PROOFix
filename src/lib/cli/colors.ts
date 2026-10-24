/**
 * PROOFix CLI ANSI Colors & Terminal Styling
 * Zero-dependency terminal formatting utilities with TTY/NO_COLOR detection.
 */

const ANSI_REGEX = /\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g;

export function stripAnsi(str: string): string {
  return str.replace(ANSI_REGEX, '');
}

export function supportsColor(): boolean {
  if (process.env.NO_COLOR && process.env.NO_COLOR !== '0') return false;
  if (process.env.FORCE_COLOR && process.env.FORCE_COLOR !== '0') return true;
  return Boolean(process.stdout && process.stdout.isTTY);
}

function wrap(code: number, close: number, text: string): string {
  if (!supportsColor()) return text;
  return `\x1b[${code}m${text}\x1b[${close}m`;
}

export const colors = {
  reset: (text: string) => wrap(0, 0, text),
  bold: (text: string) => wrap(1, 22, text),
  dim: (text: string) => wrap(2, 22, text),
  italic: (text: string) => wrap(3, 23, text),
  underline: (text: string) => wrap(4, 24, text),
  inverse: (text: string) => wrap(7, 27, text),

  // Standard Colors
  black: (text: string) => wrap(30, 39, text),
  red: (text: string) => wrap(31, 39, text),
  green: (text: string) => wrap(32, 39, text),
  yellow: (text: string) => wrap(33, 39, text),
  blue: (text: string) => wrap(34, 39, text),
  magenta: (text: string) => wrap(35, 39, text),
  cyan: (text: string) => wrap(36, 39, text),
  white: (text: string) => wrap(37, 39, text),
  gray: (text: string) => wrap(90, 39, text),

  // Background Colors
  bgBlack: (text: string) => wrap(40, 49, text),
  bgRed: (text: string) => wrap(41, 49, text),
  bgGreen: (text: string) => wrap(42, 49, text),
  bgYellow: (text: string) => wrap(43, 49, text),
  bgBlue: (text: string) => wrap(44, 49, text),
  bgMagenta: (text: string) => wrap(45, 49, text),
  bgCyan: (text: string) => wrap(46, 49, text),
  bgWhite: (text: string) => wrap(47, 49, text),
};

export const symbols = {
  tick: '✓',
  cross: '✖',
  warn: '⚠',
  info: 'ℹ',
  arrow: '→',
  bullet: '•',
  spinner: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
};

export function badge(label: string, style: 'green' | 'red' | 'yellow' | 'cyan' | 'gray'): string {
  const padded = ` ${label.toUpperCase()} `;
  switch (style) {
    case 'green':
      return colors.bgGreen(colors.black(padded));
    case 'red':
      return colors.bgRed(colors.white(padded));
    case 'yellow':
      return colors.bgYellow(colors.black(padded));
    case 'cyan':
      return colors.bgCyan(colors.black(padded));
    case 'gray':
    default:
      return colors.bgBlack(colors.white(padded));
  }
}
