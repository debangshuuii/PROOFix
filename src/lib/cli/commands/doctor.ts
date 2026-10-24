/**
 * PROOFix CLI: `proofix doctor` Command Handler
 * Executes host diagnostics, renders tabular reports, handles --heal and --json modes.
 */

import { printBanner } from '../banner.ts';
import { colors, symbols, badge } from '../colors.ts';
import { renderTable, createBox } from '../table.ts';
import { runDoctorSuite, type RunDoctorOptions } from '../doctor/suite.ts';
import type { DoctorReport, DoctorCheckResult } from '../types.ts';

export interface DoctorCommandOptions extends RunDoctorOptions {
  json?: boolean;
  verbose?: boolean;
}

export async function executeDoctorCommand(options: DoctorCommandOptions = {}): Promise<DoctorReport> {
  const isJson = options.json ?? false;

  if (!isJson) {
    printBanner('System Diagnostic Suite');
    console.log(colors.cyan(`Running PROOFix pre-flight environment checks...\n`));
  }

  const report = await runDoctorSuite({
    ...options,
    onHealingProgress: (msg) => {
      if (!isJson) {
        console.log(`  ${colors.yellow(symbols.spinner[0])} ${colors.yellow(msg)}`);
      }
    },
  });

  if (isJson) {
    console.log(JSON.stringify(report, null, 2));
    return report;
  }

  // Format table rows
  const rows = report.checks.map((c) => {
    let statusText: string;
    switch (c.status) {
      case 'passed':
        statusText = colors.green(`${symbols.tick} PASS`);
        break;
      case 'healed':
        statusText = colors.cyan(`${symbols.tick} HEALED`);
        break;
      case 'warning':
        statusText = colors.yellow(`${symbols.warn} WARN`);
        break;
      case 'failed':
      default:
        statusText = colors.red(`${symbols.cross} FAIL`);
        break;
    }

    return {
      category: c.category.toUpperCase(),
      name: c.name,
      status: statusText,
      message: c.message,
    };
  });

  const columns = [
    { header: 'Domain', key: 'category', align: 'left' as const, minWidth: 10 },
    { header: 'Diagnostic Check', key: 'name', align: 'left' as const, minWidth: 26 },
    { header: 'Status', key: 'status', align: 'center' as const, minWidth: 10 },
    { header: 'Message', key: 'message', align: 'left' as const },
  ];

  console.log(renderTable(columns, rows));
  console.log('');

  // Recommendations box if warnings or failures exist
  const actionable = report.checks.filter((c) => c.recommendation);
  if (actionable.length > 0) {
    const recLines = actionable.map((c) => `${colors.bold(c.name)}: ${c.recommendation}`);
    console.log(createBox('Recommendations & Remediation', recLines, { borderColor: colors.yellow }));
    console.log('');
  }

  // Final summary badge
  let overallBadge: string;
  if (report.overallStatus === 'healthy') {
    overallBadge = badge('HEALTHY — READY FOR FULL VERIFICATION', 'green');
  } else if (report.overallStatus === 'degraded') {
    overallBadge = badge('DEGRADED — HEURISTIC FALLBACKS ACTIVE', 'yellow');
  } else {
    overallBadge = badge('UNHEALTHY — ACTION REQUIRED', 'red');
  }

  console.log(`  System Health: ${overallBadge}\n`);
  return report;
}
