/**
 * PROOFix CLI: `proofix run` Command Handler
 * Executes the 11-stage verification pipeline with live TUI progress, scenario filtering, and streaming logs.
 */

import { printBanner } from '../banner.ts';
import { colors, badge, symbols } from '../colors.ts';
import { createBox } from '../table.ts';
import { StreamingReporter } from '../runner/streaming-reporter.ts';
import { CliPipelineExecutor } from '../runner/pipeline.ts';
import type { CliRunOptions, CliRunResult } from '../types.ts';

export async function executeRunCommand(options: CliRunOptions = {}): Promise<CliRunResult> {
  const isJson = options.json ?? false;
  const isInteractive = options.interactive ?? Boolean(process.stdout && process.stdout.isTTY);

  if (!isJson) {
    printBanner('11-Stage Verification Runner');
    const targetScenario = options.scenario || 'ecommerce_checkout';
    console.log(
      `  Target Scenario: ${colors.bold(colors.cyan(targetScenario))} ${
        options.headless ? colors.gray('[headless]') : ''
      }`
    );
    console.log(
      `  Execution Mode:  ${
        isInteractive ? colors.green('Interactive TUI') : colors.yellow('Standard Output Stream')
      }\n`
    );
  }

  const reporter = new StreamingReporter({
    interactive: isInteractive,
    quiet: isJson,
  });

  const executor = new CliPipelineExecutor();

  const result = await executor.execute(options, {
    onStageStart: (stageId, index, total, name) => {
      reporter.onStageStart(stageId, index, total, name);
    },
    onStageLog: (stageId, msg) => {
      reporter.onStageLog(stageId, msg);
    },
    onStageComplete: (stageId, status, durationMs, summary) => {
      reporter.onStageComplete(stageId, status, durationMs, summary);
    },
  });

  if (isJson) {
    console.log(JSON.stringify(result, null, 2));
    return result;
  }

  console.log('');

  // Summary box
  const durationSec = (result.totalDurationMs / 1000).toFixed(2);
  const summaryLines = [
    `Run ID:           ${colors.cyan(result.runId)}`,
    `Scenario:         ${result.scenarioId || 'All'}`,
    `Total Duration:   ${durationSec}s`,
    `Verification:     ${colors.green(`${result.passedCount} Passed`)}, ${colors.red(
      `${result.failedCount} Failed`
    )}, ${colors.gray(`${result.skippedCount} Skipped`)}`,
  ];

  if (result.status === 'failed') {
    summaryLines.push('');
    summaryLines.push(
      `${colors.yellow(symbols.warn)} Autonomous repair patch is available! Review and apply with:`
    );
    summaryLines.push(`   ${colors.bold(colors.green(`npx proofix fix --scenario ${result.scenarioId || ''} --apply`))}`);
  }

  const boxBorder = result.status === 'passed' ? colors.green : colors.yellow;
  console.log(createBox('Verification Run Summary', summaryLines, { borderColor: boxBorder }));
  console.log('');

  const statusBadge =
    result.status === 'passed'
      ? badge('ALL STAGES VERIFIED (100%)', 'green')
      : badge('DEFECT DETECTED — REPAIR REQUIRED', 'yellow');

  console.log(`  Overall Result: ${statusBadge}\n`);
  return result;
}
