import { RouteHandlerInfo, RouteStatusRecord } from './types';

export interface CodeLensCommand {
  title: string;
  command: string;
  arguments?: any[];
}

export interface CodeLensItem {
  range: { startLine: number; startCol: number; endLine: number; endCol: number };
  command?: CodeLensCommand;
}

/**
 * Provides interactive CodeLens actions directly above route component exports.
 */
export class RouteCodeLensProvider {
  private routeStatuses = new Map<string, RouteStatusRecord>();

  public setRouteStatus(routePath: string, status: RouteStatusRecord): void {
    this.routeStatuses.set(routePath, status);
  }

  public provideCodeLenses(routeInfo: RouteHandlerInfo): CodeLensItem[] {
    const lenses: CodeLensItem[] = [];
    const status = this.routeStatuses.get(routeInfo.routePath);
    const range = {
      startLine: routeInfo.line,
      startCol: 0,
      endLine: routeInfo.line,
      endCol: 0,
    };

    // 1. Primary "Run Journey" CodeLens
    lenses.push({
      range,
      command: {
        title: `▶ Run Journey (${routeInfo.routePath})`,
        command: 'proofix.runRoute',
        arguments: [routeInfo.routePath, routeInfo.filePath],
      },
    });

    // 2. Dual-Pass "Prove Route" CodeLens
    lenses.push({
      range,
      command: {
        title: `🛡️ Prove Route`,
        command: 'proofix.proveRoute',
        arguments: [routeInfo.routePath, routeInfo.filePath],
      },
    });

    // 3. Status indicator CodeLens (Passed / Failed / Untested)
    if (status && status.status === 'proven') {
      lenses.push({
        range,
        command: {
          title: `✅ Proven (${status.passedJourneys}/${status.totalJourneys})`,
          command: 'proofix.showPanel',
          arguments: [routeInfo.routePath],
        },
      });
    } else if (status && status.status === 'failing') {
      lenses.push({
        range,
        command: {
          title: `🚨 Failing (Inspect Failure Evidence)`,
          command: 'proofix.openFailureDiff',
          arguments: [routeInfo.routePath],
        },
      });
    } else {
      lenses.push({
        range,
        command: {
          title: `⚠️ Untested`,
          command: 'proofix.runRoute',
          arguments: [routeInfo.routePath],
        },
      });
    }

    return lenses;
  }

  public resolveCodeLens(item: CodeLensItem): CodeLensItem {
    // If dynamic route e.g. [id], parameter can be resolved dynamically
    if (item.command && item.command.arguments && item.command.arguments[0]) {
      const routeArg = item.command.arguments[0];
      if (typeof routeArg === 'string' && routeArg.includes('[')) {
        item.command.title = item.command.title.replace('(Dynamic)', '⚡');
      }
    }
    return item;
  }
}

/**
 * Formats the Run Journey CodeLens title.
 */
export function formatRunJourneyTitle(routePath: string): string {
  return `▶ Run Journey (${routePath})`;
}

/**
 * Formats the Prove Route CodeLens title.
 */
export function formatProveRouteTitle(routePath: string): string {
  return `🛡️ Prove Route (${routePath})`;
}

/**
 * Formats the Inspect Failure CodeLens title.
 */
export function formatFailureLensTitle(failureCount: number): string {
  return `🚨 ${failureCount} Failing Defect${failureCount > 1 ? 's' : ''} (Inspect Failure Evidence)`;
}
