/**
 * PROOFix CLI Animated 11-Stage Pipeline Progress Bar
 * Renders an animated multi-stage TUI bar with stage indicators, percentages, and log previews.
 */

import { colors, symbols, stripAnsi } from './colors.ts';
import { RunPipelineStage } from './types.ts';

export interface ProgressBarRenderOptions {
  stageIndex: number; // 0-based
  totalStages: number;
  stageName: string;
  stageId?: RunPipelineStage;
  status: 'pending' | 'running' | 'passed' | 'failed';
  elapsedMs: number;
  recentLog?: string;
  width?: number;
}

export const VERIFICATION_STAGES: Array<{ id: RunPipelineStage; name: string }> = [
  { id: 'preflight', name: 'Preflight Static Analysis' },
  { id: 'mock_replay', name: 'Mock Contract Replay' },
  { id: 'action_simulation', name: 'Action Journey Simulation' },
  { id: 'visual_regression', name: 'Visual Pixel Regression' },
  { id: 'accessibility', name: 'WCAG 2.1 AA Accessibility' },
  { id: 'performance', name: 'Lighthouse Performance Audit' },
  { id: 'semantic_vision', name: 'Semantic Vision & Layout' },
  { id: 'api_fuzzing', name: 'API Fuzzing & Boundaries' },
  { id: 'security_gate', name: 'Security Preflight Blocker Gate' },
  { id: 'distributed_tracing', name: 'OpenTelemetry Distributed Tracing' },
  { id: 'self_healing_repair', name: 'Autonomous Self-Healing Repair' },
];

export class PipelineProgressBar {
  private frame = 0;
  private width: number;

  constructor(width = 40) {
    this.width = width;
  }

  public nextFrame(): number {
    this.frame = (this.frame + 1) % symbols.spinner.length;
    return this.frame;
  }

  public render(opts: ProgressBarRenderOptions): string {
    const total = opts.totalStages || VERIFICATION_STAGES.length;
    const current = Math.min(Math.max(opts.stageIndex, 0), total);
    const percent = Math.min(100, Math.round(((current + (opts.status === 'passed' ? 1 : 0.5)) / total) * 100));

    // Progress bar calculations
    const filledCount = Math.round((percent / 100) * this.width);
    const emptyCount = Math.max(0, this.width - filledCount);

    const filledBar = colors.cyan('━'.repeat(Math.max(0, filledCount - 1)) + (filledCount > 0 ? '╸' : ''));
    const emptyBar = colors.gray('─'.repeat(emptyCount));
    const barStr = `[${filledBar}${emptyBar}]`;

    // Status indicator
    let statusIcon: string;
    let statusColor: (t: string) => string;

    if (opts.status === 'passed') {
      statusIcon = symbols.tick;
      statusColor = colors.green;
    } else if (opts.status === 'failed') {
      statusIcon = symbols.cross;
      statusColor = colors.red;
    } else {
      statusIcon = symbols.spinner[this.frame % symbols.spinner.length];
      statusColor = colors.yellow;
    }

    const elapsedSec = (opts.elapsedMs / 1000).toFixed(1);
    const headerLine = ` ${statusColor(statusIcon)} ${colors.bold(opts.stageName)} ${colors.gray(`(${elapsedSec}s)`)}`;
    const progressLine = `   ${barStr} ${colors.bold(`${percent}%`)} ${colors.gray(`[${opts.stageIndex + 1}/${total}]`)}`;

    const lines = [headerLine, progressLine];

    if (opts.recentLog) {
      const clean = stripAnsi(opts.recentLog).trim();
      const truncated = clean.length > 70 ? clean.substring(0, 67) + '...' : clean;
      lines.push(`   ${colors.dim('↳')} ${colors.gray(truncated)}`);
    }

    return lines.join('\n');
  }
}
