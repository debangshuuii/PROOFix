import type { DomMutationRecord } from '../types/live-companion.ts';
import { globalTelemetryBroadcaster, TelemetryBroadcaster } from './telemetry-broadcaster.ts';

export interface MutationFilterOptions {
  ignoredAttributePatterns?: RegExp[];
  ignoredSelectorPatterns?: RegExp[];
  maxBatchedMutationsPerStep?: number;
}

const DEFAULT_IGNORED_ATTRIBUTES = [
  /^data-react/,
  /^data-testid/,
  /^class.*loading/,
  /^aria-busy/,
];

const DEFAULT_IGNORED_SELECTORS = [
  /script/i,
  /style/i,
  /head/i,
  /__next/i,
];

export class DomMutationTracker {
  private runId: string;
  private broadcaster: TelemetryBroadcaster;
  private options: MutationFilterOptions;
  private stepMutations: Map<number, DomMutationRecord[]> = new Map();

  constructor(
    runId: string,
    options: MutationFilterOptions = {},
    broadcaster: TelemetryBroadcaster = globalTelemetryBroadcaster
  ) {
    this.runId = runId;
    this.options = {
      ignoredAttributePatterns: options.ignoredAttributePatterns ?? DEFAULT_IGNORED_ATTRIBUTES,
      ignoredSelectorPatterns: options.ignoredSelectorPatterns ?? DEFAULT_IGNORED_SELECTORS,
      maxBatchedMutationsPerStep: options.maxBatchedMutationsPerStep ?? 50,
    };
    this.broadcaster = broadcaster;
  }

  /**
   * Evaluates if a mutation record is meaningful or noisy framework internal.
   */
  public isMeaningfulMutation(record: DomMutationRecord): boolean {
    if (this.options.ignoredSelectorPatterns?.some((p) => p.test(record.targetSelector))) {
      return false;
    }

    if (record.type === 'attributes' && record.attributeName) {
      if (this.options.ignoredAttributePatterns?.some((p) => p.test(record.attributeName!))) {
        return false;
      }
      // If old value equals new value, no real mutation
      if (record.oldValue === record.newValue) {
        return false;
      }
    }

    return true;
  }

  /**
   * Ingests a raw batch of mutation events from Playwright or client-side observer.
   */
  public recordMutations(stepIndex: number, rawRecords: DomMutationRecord[]): DomMutationRecord[] {
    const meaningful = rawRecords.filter((r) => this.isMeaningfulMutation(r));
    if (meaningful.length === 0) return [];

    if (!this.stepMutations.has(stepIndex)) {
      this.stepMutations.set(stepIndex, []);
    }
    const current = this.stepMutations.get(stepIndex)!;
    const remainingQuota = (this.options.maxBatchedMutationsPerStep ?? 50) - current.length;

    const toAdd = meaningful.slice(0, Math.max(0, remainingQuota));
    current.push(...toAdd);

    // Broadcast meaningful mutation events
    for (const mutation of toAdd) {
      this.broadcaster.broadcast(this.runId, 'dom_mutation', {
        stepIndex,
        mutation,
      });
    }

    return toAdd;
  }

  /**
   * Retrieves all mutations recorded during a specific step.
   */
  public getStepMutations(stepIndex: number): DomMutationRecord[] {
    return [...(this.stepMutations.get(stepIndex) || [])];
  }

  /**
   * Returns a concise human-readable summary of DOM activity for a step.
   */
  public summarizeStepActivity(stepIndex: number): string {
    const records = this.stepMutations.get(stepIndex) || [];
    if (records.length === 0) {
      return 'No significant DOM mutations observed.';
    }

    let addedNodes = 0;
    let removedNodes = 0;
    const attributeChanges: string[] = [];

    for (const r of records) {
      if (r.type === 'childList') {
        addedNodes += r.addedNodesCount || 0;
        removedNodes += r.removedNodesCount || 0;
      } else if (r.type === 'attributes' && r.attributeName) {
        attributeChanges.push(`${r.targetSelector}[${r.attributeName}]`);
      }
    }

    const summaryParts: string[] = [];
    if (addedNodes > 0) summaryParts.push(`+${addedNodes} elements added`);
    if (removedNodes > 0) summaryParts.push(`-${removedNodes} elements removed`);
    if (attributeChanges.length > 0) {
      const sample = attributeChanges.slice(0, 3).join(', ');
      summaryParts.push(`Attributes changed on: ${sample}`);
    }

    return summaryParts.join('; ');
  }

  /**
   * Generates client-side injection script for Playwright page context.
   */
  public static getInjectionScript(): string {
    return `
      (function() {
        if (window.__proofixObserver) return;
        window.__proofixMutations = [];
        const observer = new MutationObserver((mutations) => {
          for (const m of mutations) {
            const target = m.target;
            const selector = target.id ? '#' + target.id : (target.className ? '.' + String(target.className).split(' ')[0] : target.nodeName.toLowerCase());
            window.__proofixMutations.push({
              type: m.type,
              targetSelector: selector,
              attributeName: m.attributeName,
              addedNodesCount: m.addedNodes.length,
              removedNodesCount: m.removedNodes.length,
              timestamp: new Date().toISOString()
            });
          }
        });
        observer.observe(document.body, { attributes: true, childList: true, subtree: true });
        window.__proofixObserver = observer;
      })();
    `;
  }
}
