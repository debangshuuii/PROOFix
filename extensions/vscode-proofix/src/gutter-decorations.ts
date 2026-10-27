import { RouteHandlerInfo, RouteStatusRecord } from './types';
import {
  SVG_PROVEN_GUTTER,
  SVG_FAILED_GUTTER,
  SVG_UNTESTED_GUTTER,
  SVG_PROVING_GUTTER,
} from './icons';

export interface MockDecorationType {
  key: string;
  options: any;
}

export interface DecorationItem {
  range: { startLine: number; startCol: number; endLine: number; endCol: number };
  hoverMessage: string;
  iconUri: string;
}

/**
 * Manages gutter decorations displaying live route verification status badges.
 */
export class GutterDecorationProvider {
  private routeStatuses = new Map<string, RouteStatusRecord>();

  public setRouteStatus(routePath: string, status: RouteStatusRecord): void {
    this.routeStatuses.set(routePath, status);
  }

  public getRouteStatus(routePath: string): RouteStatusRecord | undefined {
    return this.routeStatuses.get(routePath);
  }

  public computeDecorationsForRoute(
    routeInfo: RouteHandlerInfo
  ): DecorationItem | null {
    const statusRecord = this.routeStatuses.get(routeInfo.routePath) || {
      routePath: routeInfo.routePath,
      status: 'untested',
      passedJourneys: 0,
      totalJourneys: 0,
      durationMs: 0,
      lastVerified: 'Never',
    };

    let iconUri = SVG_UNTESTED_GUTTER;
    let hoverTitle = `PROOFix: Route ${routeInfo.routePath} (Untested)`;
    let hoverDetails = 'Click "Run Journey" or "Prove Route" to verify with Playwright.';

    switch (statusRecord.status) {
      case 'proven':
        iconUri = SVG_PROVEN_GUTTER;
        hoverTitle = `🛡️ **PROOFix: Proven** (${statusRecord.passedJourneys}/${statusRecord.totalJourneys} journeys passing)`;
        hoverDetails = `Duration: ${(statusRecord.durationMs / 1000).toFixed(1)}s • 0 Regressions\nLast Verified: ${statusRecord.lastVerified}`;
        if (statusRecord.proofFingerprint) {
          hoverDetails += `\nSHA-256: \`${statusRecord.proofFingerprint.slice(0, 16)}...\``;
        }
        break;
      case 'failing':
        iconUri = SVG_FAILED_GUTTER;
        hoverTitle = `🚨 **PROOFix: Failing Checks Detected** (${statusRecord.totalJourneys - statusRecord.passedJourneys} failure)`;
        hoverDetails = statusRecord.failureSnippet
          ? `Error: \`${statusRecord.failureSnippet}\`\nClick "Inspect Failure Diff" to review.`
          : 'Verification failure encountered.';
        break;
      case 'proving':
        iconUri = SVG_PROVING_GUTTER;
        hoverTitle = `⏳ **PROOFix: Dual-Pass Shadow Prover Running...**`;
        hoverDetails = 'Executing isolated Playwright sandbox pass...';
        break;
    }

    const hoverMessage = `${hoverTitle}\n\n${hoverDetails}`;

    return {
      range: {
        startLine: routeInfo.line,
        startCol: 0,
        endLine: routeInfo.line,
        endCol: 0,
      },
      hoverMessage,
      iconUri,
    };
  }

  public updateEditorDecorations(
    editor: { document: { fileName: string }; setDecorations: (type: any, ranges: any[]) => void },
    routeIndex: { getByFile: (file: string) => RouteHandlerInfo | undefined }
  ): DecorationItem | null {
    if (!editor || !editor.document) return null;
    const route = routeIndex.getByFile(editor.document.fileName);
    if (!route) return null;
    return this.computeDecorationsForRoute(route);
  }

  public refreshAllVisibleDecorations(
    editors: Array<{ document: { fileName: string }; setDecorations: (type: any, ranges: any[]) => void }>,
    routeIndex: { getByFile: (file: string) => RouteHandlerInfo | undefined }
  ): DecorationItem[] {
    const items: DecorationItem[] = [];
    for (const ed of editors) {
      const dec = this.updateEditorDecorations(ed, routeIndex);
      if (dec) items.push(dec);
    }
    return items;
  }

  public clear(): void {
    this.routeStatuses.clear();
  }
}

/**
 * Formats rich hover Markdown for the route status badge lens.
 */
export function formatHoverMarkdown(status: RouteStatusRecord): string {
  const badgeEmoji = status.status === 'proven' ? '🛡️' : status.status === 'failing' ? '🚨' : '⏳';
  const passRate = status.totalJourneys > 0 ? Math.round((status.passedJourneys / status.totalJourneys) * 100) : 0;

  return [
    `### ${badgeEmoji} PROOFix Route Status: ${status.status.toUpperCase()}`,
    `**Target Route:** \`${status.routePath}\``,
    `**Pass Rate:** **${passRate}%** (${status.passedJourneys}/${status.totalJourneys} journeys passing)`,
    `**Execution Duration:** ${(status.durationMs / 1000).toFixed(1)}s`,
    `**Last Verified:** ${status.lastVerified}`,
    status.proofFingerprint ? `**Cryptographic Proof:** \`${status.proofFingerprint.slice(0, 16)}...\`` : '',
    status.failureSnippet ? `\n> ⚠️ **Failure Cause:** \`${status.failureSnippet}\`` : '',
  ].filter(Boolean).join('\n\n');
}
