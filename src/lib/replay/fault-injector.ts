/**
 * Fault & Chaos Injection Engine (Contribution 145)
 */

import type {
  RecordedRequest,
  RecordedResponse,
  FaultInjectionRule,
  FaultType,
} from '../types/mock-replay.ts';

export interface FaultExecutionResult {
  intercepted: boolean;
  modifiedResponse?: RecordedResponse;
  errorToThrow?: Error;
  delayAppliedMs: number;
  ruleApplied?: FaultInjectionRule;
}

/**
 * Checks if a request matches a fault injection rule.
 */
export function doesRuleApply(
  rule: FaultInjectionRule,
  req: RecordedRequest,
  provider?: string
): boolean {
  if (!rule.enabled) return false;

  // Provider match
  if (rule.targetProvider && provider && rule.targetProvider.toLowerCase() !== provider.toLowerCase()) {
    return false;
  }

  // Method match
  if (rule.method && rule.method.toUpperCase() !== req.method.toUpperCase()) {
    return false;
  }

  // URL pattern match
  if (rule.urlPattern) {
    try {
      const regex = new RegExp(rule.urlPattern, 'i');
      if (!regex.test(req.url)) {
        return false;
      }
    } catch {
      // Fallback simple includes
      if (!req.url.includes(rule.urlPattern)) return false;
    }
  }

  // Drop / Trigger percentage (default 100%)
  if (rule.params.dropPercentage !== undefined && rule.params.dropPercentage < 100) {
    const randomChance = Math.random() * 100;
    if (randomChance > rule.params.dropPercentage) {
      return false;
    }
  }

  return true;
}

export class FaultInjector {
  private rules: Map<string, FaultInjectionRule> = new Map();

  constructor(rules: FaultInjectionRule[] = []) {
    for (const r of rules) {
      this.rules.set(r.id, { ...r });
    }
  }

  public addRule(rule: FaultInjectionRule): void {
    this.rules.set(rule.id, { ...rule });
  }

  public removeRule(id: string): boolean {
    return this.rules.delete(id);
  }

  public getRules(): FaultInjectionRule[] {
    return Array.from(this.rules.values());
  }

  public clear(): void {
    this.rules.clear();
  }

  /**
   * Evaluates all active fault rules against a request and injects simulated chaos.
   */
  public async evaluateFault(
    req: RecordedRequest,
    originalResponse?: RecordedResponse,
    provider?: string
  ): Promise<FaultExecutionResult> {
    for (const rule of this.rules.values()) {
      if (doesRuleApply(rule, req, provider)) {
        return this.applyFault(rule, originalResponse);
      }
    }

    return {
      intercepted: false,
      modifiedResponse: originalResponse,
      delayAppliedMs: 0,
    };
  }

  /**
   * Applies the specific fault defined in the rule.
   */
  private async applyFault(
    rule: FaultInjectionRule,
    originalResponse?: RecordedResponse
  ): Promise<FaultExecutionResult> {
    let delayMs = 0;

    // Apply artificial latency delay if configured
    if (rule.params.delayMs && rule.params.delayMs > 0) {
      delayMs = rule.params.delayMs;
      await new Promise((r) => setTimeout(r, delayMs));
    }

    switch (rule.faultType) {
      case 'delay_latency':
        // Only delay, return original response
        return {
          intercepted: true,
          modifiedResponse: originalResponse,
          delayAppliedMs: delayMs,
          ruleApplied: rule,
        };

      case 'http_status_override': {
        const code = rule.params.statusCode || 500;
        const text = rule.params.statusText || 'Fault Injected Status';
        const body = rule.params.errorMessage
          ? JSON.stringify({ error: rule.params.errorMessage })
          : (originalResponse?.body || `{"error": "Fault injection ${code}"}`);

        return {
          intercepted: true,
          modifiedResponse: {
            statusCode: code,
            statusText: text,
            headers: { 'content-type': 'application/json' },
            body,
            durationMs: delayMs,
          },
          delayAppliedMs: delayMs,
          ruleApplied: rule,
        };
      }

      case 'rate_limit_429': {
        const retryAfter = rule.params.retryAfterSecs || 60;
        return {
          intercepted: true,
          modifiedResponse: {
            statusCode: 429,
            statusText: 'Too Many Requests',
            headers: {
              'content-type': 'application/json',
              'retry-after': String(retryAfter),
            },
            body: JSON.stringify({
              error: 'Rate limit exceeded',
              message: `Too many requests. Please retry in ${retryAfter} seconds.`,
            }),
            durationMs: delayMs,
          },
          delayAppliedMs: delayMs,
          ruleApplied: rule,
        };
      }

      case 'connection_reset': {
        const err = new Error(rule.params.errorMessage || 'read ECONNRESET - connection reset by peer');
        (err as any).code = 'ECONNRESET';
        return {
          intercepted: true,
          errorToThrow: err,
          delayAppliedMs: delayMs,
          ruleApplied: rule,
        };
      }

      case 'timeout': {
        const err = new Error(rule.params.errorMessage || 'ETIMEDOUT - connection timed out');
        (err as any).code = 'ETIMEDOUT';
        return {
          intercepted: true,
          errorToThrow: err,
          delayAppliedMs: delayMs,
          ruleApplied: rule,
        };
      }

      case 'corrupted_json': {
        return {
          intercepted: true,
          modifiedResponse: {
            statusCode: 200,
            statusText: 'OK',
            headers: { 'content-type': 'application/json' },
            body: '{"status": "processing", "items": [ {"id": 12, "title": "Truncated data',
            durationMs: delayMs,
          },
          delayAppliedMs: delayMs,
          ruleApplied: rule,
        };
      }

      case 'empty_response': {
        return {
          intercepted: true,
          modifiedResponse: {
            statusCode: 200,
            statusText: 'OK',
            headers: { 'content-type': 'text/plain' },
            body: '',
            durationMs: delayMs,
          },
          delayAppliedMs: delayMs,
          ruleApplied: rule,
        };
      }

      default:
        return {
          intercepted: false,
          modifiedResponse: originalResponse,
          delayAppliedMs: delayMs,
        };
    }
  }
}
