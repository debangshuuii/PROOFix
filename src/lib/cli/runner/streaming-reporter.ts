/**
 * PROOFix CLI Real-Time Streaming Reporter
 * Manages live terminal UI state updates and non-TTY streaming logs.
 */

import { colors, symbols } from '../colors.ts';
import { PipelineProgressBar } from '../progressbar.ts';
import type { PipelineProgressEvent, RunPipelineStage, PipelineStageStatus } from '../types.ts';

export interface ReporterOptions {
  interactive?: boolean;
  quiet?: boolean;
}

export class StreamingReporter {
  private interactive: boolean;
  private quiet: boolean;
  private progressBar: PipelineProgressBar;
  private events: PipelineProgressEvent[] = [];
  private lastRenderedLineCount = 0;
  private isTty: boolean;

  constructor(options: ReporterOptions = {}) {
    this.isTty = Boolean(process.stdout && process.stdout.isTTY);
    this.interactive = options.interactive ?? this.isTty;
    this.quiet = options.quiet ?? false;
    this.progressBar = new PipelineProgressBar(36);
  }

  public onStageStart(stageId: RunPipelineStage, stageIndex: number, total: number, name: string): void {
    const event: PipelineProgressEvent = {
      stageId,
      stageIndex,
      totalStages: total,
      stageName: name,
      status: 'running',
      elapsedMs: 0,
    };
    this.events.push(event);
    this.renderEvent(event);
  }

  public onStageLog(stageId: RunPipelineStage, log: string): void {
    const event = this.events.find((e) => e.stageId === stageId && e.status === 'running');
    if (event) {
      event.log = log;
      this.renderEvent(event);
    } else if (!this.interactive && !this.quiet) {
      console.log(`    ${colors.gray(log)}`);
    }
  }

  public onStageComplete(
    stageId: RunPipelineStage,
    status: 'passed' | 'failed',
    elapsedMs: number,
    summaryMessage?: string
  ): void {
    const event = this.events.find((e) => e.stageId === stageId);
    if (event) {
      event.status = status;
      event.elapsedMs = elapsedMs;
      if (summaryMessage) event.log = summaryMessage;
    }

    if (this.interactive && this.isTty) {
      this.clearPreviousLines();
    }

    if (!this.quiet) {
      const icon = status === 'passed' ? colors.green(symbols.tick) : colors.red(symbols.cross);
      const tag = status === 'passed' ? colors.green('[PASS]') : colors.red('[FAIL]');
      const name = event ? event.stageName : stageId;
      const duration = colors.gray(`(${elapsedMs}ms)`);
      console.log(`  ${icon} ${tag} ${name} ${duration}`);
      if (summaryMessage) {
        console.log(`     ${colors.dim('↳')} ${colors.gray(summaryMessage)}`);
      }
    }
    this.lastRenderedLineCount = 0;
  }

  private clearPreviousLines(): void {
    if (this.lastRenderedLineCount > 0 && this.isTty) {
      process.stdout.write(`\x1b[${this.lastRenderedLineCount}A\x1b[0J`);
      this.lastRenderedLineCount = 0;
    }
  }

  private renderEvent(event: PipelineProgressEvent): void {
    if (this.quiet) return;

    if (this.interactive && this.isTty) {
      this.clearPreviousLines();
      const output = this.progressBar.render({
        stageIndex: event.stageIndex,
        totalStages: event.totalStages,
        stageName: event.stageName,
        stageId: event.stageId,
        status: event.status,
        elapsedMs: event.elapsedMs,
        recentLog: event.log,
      });

      const lines = output.split('\n');
      process.stdout.write(output + '\n');
      this.lastRenderedLineCount = lines.length;
    }
  }

  public getEvents(): PipelineProgressEvent[] {
    return [...this.events];
  }
}
