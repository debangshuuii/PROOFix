/**
 * PROOFix CLI: `proofix watch` Command Handler
 * Watches files, triggers targeted Playwright test journeys on file save, and handles hotkeys.
 */

import { printBanner } from '../banner.ts';
import { colors, symbols } from '../colors.ts';
import { LocalFileWatcher } from '../watch/file-watcher.ts';
import { WatchJourneyMapper } from '../watch/journey-mapper.ts';
import { WatchKeyboardController } from '../watch/interactive-controller.ts';
import { executeRunCommand } from './run.ts';
import { executeDoctorCommand } from './doctor.ts';
import type { CliWatchOptions } from '../types.ts';

export interface WatchCommandInstance {
  watcher: LocalFileWatcher;
  controller: WatchKeyboardController;
  stop: () => void;
}

export function printWatchHeader(debounceMs: number): void {
  printBanner('Local Watch Mode');
  console.log(`  ${colors.green(symbols.tick)} Monitoring repository for changes (debounce: ${debounceMs}ms)`);
  console.log(`  ${colors.gray('Press')} ${colors.bold(colors.cyan('r'))} ${colors.gray('to rerun,')} ${colors.bold(colors.cyan('a'))} ${colors.gray('to run all,')} ${colors.bold(colors.cyan('d'))} ${colors.gray('for doctor,')} ${colors.bold(colors.cyan('q'))} ${colors.gray('to quit.')}\n`);
}

export async function executeWatchCommand(
  options: CliWatchOptions = {},
  runOnceAndExit = false
): Promise<WatchCommandInstance> {
  const debounceMs = options.debounceMs ?? 300;
  let lastScenario = options.scenario || 'ecommerce_checkout';
  let isRunningTest = false;

  printWatchHeader(debounceMs);

  const controller = new WatchKeyboardController();

  const watcher = new LocalFileWatcher({
    debounceMs,
    targetDir: options.targetDir,
    onChange: async (changedFiles) => {
      if (isRunningTest) return;
      isRunningTest = true;

      const targets = WatchJourneyMapper.mapFiles(changedFiles);
      const target = targets[0] || { scenarioId: lastScenario, reason: 'Source change detected' };
      lastScenario = target.scenarioId;

      console.log(`\n  ${colors.yellow(symbols.spinner[0])} File change detected: ${colors.bold(changedFiles.join(', '))}`);
      console.log(`  ${colors.cyan(symbols.arrow)} Triggering journey: ${colors.bold(target.scenarioId)} (${target.reason})\n`);

      try {
        await executeRunCommand({ scenario: target.scenarioId, interactive: false });
      } catch (err) {
        console.error('Run failed during watch mode:', err);
      } finally {
        isRunningTest = false;
        console.log(`\n  ${colors.gray('Waiting for file changes... (press \'h\' for shortcuts)')}`);
      }
    },
  });

  watcher.start();

  const stop = () => {
    controller.detach();
    watcher.stop();
  };

  controller.attach({
    onRerun: async () => {
      if (isRunningTest) return;
      isRunningTest = true;
      try {
        await executeRunCommand({ scenario: lastScenario, interactive: false });
      } finally {
        isRunningTest = false;
      }
    },
    onRunAll: async () => {
      if (isRunningTest) return;
      isRunningTest = true;
      try {
        await executeRunCommand({ scenario: 'ecommerce_checkout', interactive: false });
        await executeRunCommand({ scenario: 'hydration_mismatch', interactive: false });
      } finally {
        isRunningTest = false;
      }
    },
    onDoctor: async () => {
      await executeDoctorCommand({ verbose: false });
    },
    onClear: () => {
      printWatchHeader(debounceMs);
    },
    onQuit: () => {
      stop();
      process.exit(0);
    },
  });

  if (runOnceAndExit) {
    stop();
  }

  return { watcher, controller, stop };
}
