/**
 * PROOFix CLI Structured Logger
 * Color-coded, tagged, level-filtered logging with in-memory ring-buffer support.
 */

import { colors, symbols } from './colors.ts';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'success';

export interface LoggerOptions {
  level?: LogLevel;
  tag?: string;
  timestamps?: boolean;
  captureLogs?: boolean;
}

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  success: 25,
  warn: 30,
  error: 40,
};

export class CliLogger {
  private level: LogLevel;
  private tag?: string;
  private timestamps: boolean;
  private buffer: string[] = [];
  private captureLogs: boolean;

  constructor(options: LoggerOptions = {}) {
    this.level = options.level ?? 'info';
    this.tag = options.tag;
    this.timestamps = options.timestamps ?? false;
    this.captureLogs = options.captureLogs ?? false;
  }

  public setLevel(level: LogLevel): void {
    this.level = level;
  }

  public getLevel(): LogLevel {
    return this.level;
  }

  public getCapturedLogs(): string[] {
    return [...this.buffer];
  }

  public clearBuffer(): void {
    this.buffer = [];
  }

  private shouldLog(msgLevel: LogLevel): boolean {
    return LEVEL_WEIGHT[msgLevel] >= LEVEL_WEIGHT[this.level];
  }

  private formatMessage(msgLevel: LogLevel, message: string): string {
    const parts: string[] = [];

    if (this.timestamps) {
      const time = new Date().toISOString().substring(11, 19);
      parts.push(colors.gray(`[${time}]`));
    }

    if (this.tag) {
      parts.push(colors.cyan(`[${this.tag}]`));
    }

    switch (msgLevel) {
      case 'debug':
        parts.push(colors.gray('DEBUG'));
        parts.push(colors.gray(message));
        break;
      case 'info':
        parts.push(colors.blue(symbols.info));
        parts.push(message);
        break;
      case 'success':
        parts.push(colors.green(symbols.tick));
        parts.push(colors.green(message));
        break;
      case 'warn':
        parts.push(colors.yellow(symbols.warn));
        parts.push(colors.yellow(message));
        break;
      case 'error':
        parts.push(colors.red(symbols.cross));
        parts.push(colors.red(message));
        break;
    }

    return parts.join(' ');
  }

  public debug(message: string): void {
    if (!this.shouldLog('debug')) return;
    const formatted = this.formatMessage('debug', message);
    if (this.captureLogs) this.buffer.push(formatted);
    console.log(formatted);
  }

  public info(message: string): void {
    if (!this.shouldLog('info')) return;
    const formatted = this.formatMessage('info', message);
    if (this.captureLogs) this.buffer.push(formatted);
    console.log(formatted);
  }

  public success(message: string): void {
    if (!this.shouldLog('success')) return;
    const formatted = this.formatMessage('success', message);
    if (this.captureLogs) this.buffer.push(formatted);
    console.log(formatted);
  }

  public warn(message: string): void {
    if (!this.shouldLog('warn')) return;
    const formatted = this.formatMessage('warn', message);
    if (this.captureLogs) this.buffer.push(formatted);
    console.warn(formatted);
  }

  public error(message: string): void {
    if (!this.shouldLog('error')) return;
    const formatted = this.formatMessage('error', message);
    if (this.captureLogs) this.buffer.push(formatted);
    console.error(formatted);
  }

  public createChild(tag: string): CliLogger {
    return new CliLogger({
      level: this.level,
      tag: this.tag ? `${this.tag}:${tag}` : tag,
      timestamps: this.timestamps,
      captureLogs: this.captureLogs,
    });
  }
}

export const logger = new CliLogger({ tag: 'PROOFix' });
