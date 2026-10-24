/**
 * PROOFix CLI Animated Terminal Spinner
 * Provides smooth terminal spinners with TTY detection and clean cursor handling.
 */

import { colors, symbols } from './colors.ts';

export interface SpinnerOptions {
  text?: string;
  frames?: string[];
  interval?: number;
  color?: (text: string) => string;
}

export class TerminalSpinner {
  private text: string;
  private frames: string[];
  private interval: number;
  private frameIdx = 0;
  private timer: NodeJS.Timeout | null = null;
  private isSpinning = false;
  private isTty: boolean;
  private colorFn: (text: string) => string;

  constructor(options: SpinnerOptions = {}) {
    this.text = options.text ?? '';
    this.frames = options.frames ?? symbols.spinner;
    this.interval = options.interval ?? 80;
    this.colorFn = options.color ?? colors.cyan;
    this.isTty = Boolean(process.stdout && process.stdout.isTTY);
  }

  public start(text?: string): this {
    if (text) this.text = text;
    if (this.isSpinning) return this;

    this.isSpinning = true;
    if (!this.isTty) {
      if (this.text) console.log(`${colors.cyan(symbols.arrow)} ${this.text}...`);
      return this;
    }

    // Hide cursor
    process.stdout.write('\x1b[?25l');
    this.render();

    this.timer = setInterval(() => {
      this.frameIdx = (this.frameIdx + 1) % this.frames.length;
      this.render();
    }, this.interval);

    if (this.timer && typeof this.timer.unref === 'function') {
      this.timer.unref();
    }

    return this;
  }

  public update(text: string): this {
    this.text = text;
    if (this.isSpinning && this.isTty) {
      this.render();
    }
    return this;
  }

  private render(): void {
    if (!this.isTty) return;
    const frame = this.colorFn(this.frames[this.frameIdx]);
    process.stdout.write(`\r\x1b[K${frame} ${this.text}`);
  }

  public stop(): this {
    if (!this.isSpinning) return this;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isSpinning = false;
    if (this.isTty) {
      process.stdout.write('\r\x1b[K\x1b[?25h');
    }
    return this;
  }

  public succeed(text?: string): this {
    this.stop();
    const msg = text ?? this.text;
    console.log(`${colors.green(symbols.tick)} ${msg}`);
    return this;
  }

  public fail(text?: string): this {
    this.stop();
    const msg = text ?? this.text;
    console.log(`${colors.red(symbols.cross)} ${msg}`);
    return this;
  }

  public warn(text?: string): this {
    this.stop();
    const msg = text ?? this.text;
    console.log(`${colors.yellow(symbols.warn)} ${msg}`);
    return this;
  }

  public isRunning(): boolean {
    return this.isSpinning;
  }
}

export function createSpinner(text?: string): TerminalSpinner {
  return new TerminalSpinner({ text });
}
