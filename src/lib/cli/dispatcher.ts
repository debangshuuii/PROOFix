import { executeProveCommand } from './commands/prove.ts';
/**
 * PROOFix CLI Command Dispatcher & Argument Parser
 * Parses CLI flags, routes subcommands, and handles process exit codes.
 */

import { executeDoctorCommand } from './commands/doctor.ts';
import { executeRunCommand } from './commands/run.ts';
import { executeFixCommand } from './commands/fix.ts';
import { executeWatchCommand } from './commands/watch.ts';
import { executeAnalyzeCommand } from './commands/analyze.ts';
import { executeStatusCommand } from './commands/status.ts';
import { printBanner, PROOFIX_VERSION } from './banner.ts';
import { colors } from './colors.ts';
import type { CliCommand, ParsedCliArgs } from './types.ts';

export function parseArgs(rawArgs: string[]): ParsedCliArgs {
  const flags: Record<string, boolean | string | number> = {};
  const positional: string[] = [];
  let command: CliCommand = 'help';

  let i = 0;
  while (i < rawArgs.length) {
    const arg = rawArgs[i];

    if (arg === '--version' || arg === '-v') {
      flags.version = true;
      command = 'version';
      i++;
      continue;
    }

    if (arg === '--help' || arg === '-h') {
      flags.help = true;
      i++;
      continue;
    }

    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      if (key.includes('=')) {
        const [k, v] = key.split('=');
        flags[k] = v;
      } else if (i + 1 < rawArgs.length && !rawArgs[i + 1].startsWith('-')) {
        const nextVal = rawArgs[i + 1];
        if (key === 'debounce' || key === 'port') {
          flags[key] = parseInt(nextVal, 10);
        } else {
          flags[key] = nextVal;
        }
        i += 2;
        continue;
      } else {
        flags[key] = true;
      }
      i++;
      continue;
    }

    if (arg.startsWith('-')) {
      const shortKey = arg.slice(1);
      switch (shortKey) {
        case 'i':
          flags.interactive = true;
          break;
        case 's':
          if (i + 1 < rawArgs.length && !rawArgs[i + 1].startsWith('-')) {
            flags.scenario = rawArgs[i + 1];
            i++;
          }
          break;
        case 'q':
          flags.quiet = true;
          break;
        default:
          flags[shortKey] = true;
          break;
      }
      i++;
      continue;
    }

    // Positional / Subcommand
    if (positional.length === 0 && !flags.help) {
      const lower = arg.toLowerCase();
      if (['doctor', 'run', 'fix', 'watch', 'analyze', 'status', 'mcp', 'prove', 'help', 'version'].includes(lower)) {
        command = lower as CliCommand;
      } else {
        positional.push(arg);
      }
    } else {
      positional.push(arg);
    }
    i++;
  }

  if (flags.help && command !== 'version') {
    command = 'help';
  }

  return { command, flags, positional };
}

export function showHelp(): void {
  printBanner();
  console.log(`Commands:
  ${colors.green('doctor')}              Validate host environment (Node.js, Playwright, ports, AI keys)
  ${colors.green('run')}                 Execute verification pipeline against benchmark scenarios
  ${colors.green('fix')}                 Review unified diffs and apply autonomous self-healing patches
  ${colors.green('watch')}               Watch local files and auto-rerun Playwright journeys on save
  ${colors.green('analyze [dir]')}       Inspect repository structure, routes, and framework
  ${colors.green('status')}              Check health of the running PROOFix verification engine
  ${colors.green('help')}                Display this help screen
  ${colors.green('version')}             Print PROOFix CLI version

Options:
  ${colors.cyan('-i, --interactive')}    Enable interactive terminal UI (TUI) with animated progress
  ${colors.cyan('-s, --scenario <id>')}  Target a specific benchmark scenario (checkout, hydration, sqli)
  ${colors.cyan('--apply')}              Apply proposed AI self-repair patch immediately
  ${colors.cyan('--rollback')}           Revert previously applied self-healing patch
  ${colors.cyan('--heal')}               Auto-install missing dependencies (e.g. Playwright Chromium)
  ${colors.cyan('--headless')}           Execute browser verification in headless mode
  ${colors.cyan('--json')}               Output machine-readable JSON
  ${colors.cyan('-v, --version')}        Show CLI version
  ${colors.cyan('-h, --help')}           Show help information
`);
}

export async function dispatch(rawArgs: string[]): Promise<number> {
  const parsed = parseArgs(rawArgs);

  if (parsed.command === 'version') {
    console.log(`PROOFix CLI v${PROOFIX_VERSION}`);
    return 0;
  }

  if (parsed.command === 'help') {
    showHelp();
    return 0;
  }

  if (parsed.command === 'doctor') {
    const report = await executeDoctorCommand({
      heal: Boolean(parsed.flags.heal),
      json: Boolean(parsed.flags.json),
      verbose: Boolean(parsed.flags.verbose),
    });
    return report.overallStatus === 'unhealthy' ? 1 : 0;
  }

  if (parsed.command === 'run') {
    const result = await executeRunCommand({
      scenario: parsed.flags.scenario as string | undefined,
      interactive: Boolean(parsed.flags.interactive),
      headless: Boolean(parsed.flags.headless),
      json: Boolean(parsed.flags.json),
      verbose: Boolean(parsed.flags.verbose),
      bail: Boolean(parsed.flags.bail),
    });
    return result.status === 'failed' ? 1 : 0;
  }

  if (parsed.command === 'fix') {
    const result = await executeFixCommand({
      scenario: parsed.flags.scenario as string | undefined,
      apply: Boolean(parsed.flags.apply),
      rollback: Boolean(parsed.flags.rollback),
      json: Boolean(parsed.flags.json),
      interactive: Boolean(parsed.flags.interactive),
    });
    return result.success ? 0 : 1;
  }

  if (parsed.command === 'watch') {
    await executeWatchCommand({
      debounceMs: typeof parsed.flags.debounce === 'number' ? parsed.flags.debounce : undefined,
      scenario: parsed.flags.scenario as string | undefined,
    });
    return 0;
  }

  if (parsed.command === 'analyze') {
    const targetDir = parsed.positional[0] || '.';
    executeAnalyzeCommand(targetDir, Boolean(parsed.flags.json));
    return 0;
  }

  if (parsed.command === 'prove') {
    return await executeProveCommand({
      scenario: parsed.flags.scenario as string | undefined,
      patch: parsed.flags.patch as string | undefined,
      json: Boolean(parsed.flags.json),
    });
  }

  if (parsed.command === 'mcp') {
    console.log(colors.cyan('\n[PROOFix MCP Server] Starting stdio server...\n'));
    const { startMcpServer } = await import('../../../bin/proofix-mcp.js');
    await startMcpServer();
    return 0;
  }

  if (parsed.command === 'status') {
    const port = typeof parsed.flags.port === 'number' ? parsed.flags.port : undefined;
    const result = await executeStatusCommand(port, Boolean(parsed.flags.json));
    return result.active ? 0 : 1;
  }

  return 0;
}
