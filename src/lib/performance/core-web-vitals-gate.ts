/**
 * Core Web Vitals & Lighthouse Performance Budget Gatekeeper
 * Evaluates Largest Contentful Paint (LCP), Cumulative Layout Shift (CLS),
 * Interaction to Next Paint (INP), and Time to First Byte (TTFB).
 * Enforces strict deployment gates (LCP > 2.5s, CLS > 0.1).
 */

import type { CoreWebVitals, VitalMetric, VitalRating } from '../types/performance.ts';
import type {
  WebVitalsBudgetConfig,
  WebVitalsGateResult,
  WebVitalsViolation,
} from '../types/pr-bot.ts';

export const DEFAULT_WEB_VITALS_BUDGET: WebVitalsBudgetConfig = {
  maxLcpMs: 2500,     // 2.5 seconds
  maxClsScore: 0.10,  // 0.10 shift score
  maxInpMs: 200,      // 200ms
  maxTtfbMs: 800,     // 800ms
  warnLcpMs: 2000,    // 2.0 seconds warning threshold
  warnClsScore: 0.05, // 0.05 warning threshold
  failOnBudgetViolation: true,
};

export class CoreWebVitalsGatekeeper {
  private config: WebVitalsBudgetConfig;

  constructor(customConfig?: Partial<WebVitalsBudgetConfig>) {
    this.config = {
      ...DEFAULT_WEB_VITALS_BUDGET,
      ...customConfig,
    };
  }

  /**
   * Evaluates measured Core Web Vitals against strict budget thresholds.
   */
  public evaluateVitals(
    vitals: CoreWebVitals,
    baselineVitals?: CoreWebVitals
  ): WebVitalsGateResult {
    const violations: WebVitalsViolation[] = [];

    // 1. Evaluate LCP (Largest Contentful Paint)
    const lcpVal = vitals.lcp.value ?? 0;
    if (lcpVal > this.config.maxLcpMs) {
      const delta = baselineVitals?.lcp.value ? lcpVal - baselineVitals.lcp.value : undefined;
      violations.push({
        metric: 'LCP',
        actualValue: lcpVal,
        threshold: this.config.maxLcpMs,
        severity: 'error',
        unit: 'ms',
        deltaVsBaseline: delta,
        recommendation: `LCP of ${lcpVal.toFixed(0)}ms exceeds budget (${this.config.maxLcpMs}ms). Optimize hero images (priority/fetchpriority), inline critical CSS, and eliminate render-blocking scripts.`,
      });
    } else if (this.config.warnLcpMs && lcpVal > this.config.warnLcpMs) {
      violations.push({
        metric: 'LCP',
        actualValue: lcpVal,
        threshold: this.config.warnLcpMs,
        severity: 'warning',
        unit: 'ms',
        recommendation: `LCP of ${lcpVal.toFixed(0)}ms is approaching threshold (${this.config.maxLcpMs}ms). Audit largest visible element.`,
      });
    }

    // 2. Evaluate CLS (Cumulative Layout Shift)
    const clsVal = vitals.cls.value ?? 0;
    if (clsVal > this.config.maxClsScore) {
      const delta = baselineVitals?.cls.value ? clsVal - baselineVitals.cls.value : undefined;
      violations.push({
        metric: 'CLS',
        actualValue: Number(clsVal.toFixed(3)),
        threshold: this.config.maxClsScore,
        severity: 'error',
        unit: 'score',
        deltaVsBaseline: delta,
        recommendation: `CLS of ${clsVal.toFixed(3)} exceeds threshold (${this.config.maxClsScore}). Set explicit width/height on images and video banners, reserve skeleton space for dynamic components, and avoid late CSS injections.`,
      });
    } else if (this.config.warnClsScore && clsVal > this.config.warnClsScore) {
      violations.push({
        metric: 'CLS',
        actualValue: Number(clsVal.toFixed(3)),
        threshold: this.config.warnClsScore,
        severity: 'warning',
        unit: 'score',
        recommendation: `CLS of ${clsVal.toFixed(3)} exhibits slight layout movement. Verify font-display swap rules.`,
      });
    }

    // 3. Evaluate INP (Interaction to Next Paint) if available
    if (vitals.inp && vitals.inp.value !== null && this.config.maxInpMs) {
      const inpVal = vitals.inp.value;
      if (inpVal > this.config.maxInpMs) {
        violations.push({
          metric: 'INP',
          actualValue: inpVal,
          threshold: this.config.maxInpMs,
          severity: 'error',
          unit: 'ms',
          recommendation: `INP of ${inpVal.toFixed(0)}ms exceeds 200ms budget. Break up long main-thread JavaScript tasks using scheduler.yield() or Web Workers.`,
        });
      }
    }

    // 4. Evaluate TTFB (Time to First Byte)
    const ttfbVal = vitals.ttfb.value ?? 0;
    if (this.config.maxTtfbMs && ttfbVal > this.config.maxTtfbMs) {
      violations.push({
        metric: 'TTFB',
        actualValue: ttfbVal,
        threshold: this.config.maxTtfbMs,
        severity: 'error',
        unit: 'ms',
        recommendation: `TTFB of ${ttfbVal.toFixed(0)}ms exceeds ${this.config.maxTtfbMs}ms. Verify backend database query latency and server-side rendering caching.`,
      });
    }

    const errorCount = violations.filter((v) => v.severity === 'error').length;
    const passed = this.config.failOnBudgetViolation ? errorCount === 0 : true;

    // Calculate normalized score (100 down to 0)
    let score = 100;
    if (lcpVal > this.config.maxLcpMs) score -= 35;
    else if (lcpVal > (this.config.warnLcpMs || 2000)) score -= 15;

    if (clsVal > this.config.maxClsScore) score -= 35;
    else if (clsVal > (this.config.warnClsScore || 0.05)) score -= 15;

    if (score < 0) score = 0;

    const rating: VitalRating =
      score >= 90 ? 'good' : score >= 60 ? 'needs-improvement' : 'poor';

    const summaryMessage = passed
      ? `🟢 Core Web Vitals Gate Passed: LCP ${lcpVal.toFixed(0)}ms, CLS ${clsVal.toFixed(3)} within budget.`
      : `🔴 Core Web Vitals Gate Blocked: ${errorCount} metric violation(s) exceeded budget thresholds (LCP > 2.5s or CLS > 0.1).`;

    return {
      passed,
      score,
      rating,
      vitals,
      violations,
      summaryMessage,
    };
  }

  /**
   * Generates a GitHub markdown table formatted for PR comment embedding.
   */
  public formatMarkdownTable(result: WebVitalsGateResult): string {
    const lcp = result.vitals.lcp.value ?? 0;
    const cls = result.vitals.cls.value ?? 0;
    const ttfb = result.vitals.ttfb.value ?? 0;
    const inp = result.vitals.inp?.value ?? null;

    const lcpStatus = lcp <= this.config.maxLcpMs ? '🟢 PASS' : '🔴 FAIL';
    const clsStatus = cls <= this.config.maxClsScore ? '🟢 PASS' : '🔴 FAIL';
    const ttfbStatus = ttfb <= (this.config.maxTtfbMs || 800) ? '🟢 PASS' : '🔴 FAIL';
    const inpStatus = inp !== null ? (inp <= (this.config.maxInpMs || 200) ? '🟢 PASS' : '🔴 FAIL') : '⚪ N/A';

    let md = `| Core Web Vital | Observed Value | Budget Threshold | Status |\n`;
    md += `| :--- | :---: | :---: | :---: |\n`;
    md += `| **LCP** (Largest Contentful Paint) | \`${lcp.toFixed(0)}ms\` | \`<= ${this.config.maxLcpMs}ms\` | ${lcpStatus} |\n`;
    md += `| **CLS** (Cumulative Layout Shift) | \`${cls.toFixed(3)}\` | \`<= ${this.config.maxClsScore}\` | ${clsStatus} |\n`;
    md += `| **TTFB** (Time to First Byte) | \`${ttfb.toFixed(0)}ms\` | \`<= ${this.config.maxTtfbMs || 800}ms\` | ${ttfbStatus} |\n`;
    if (inp !== null) {
      md += `| **INP** (Interaction to Next Paint) | \`${inp.toFixed(0)}ms\` | \`<= ${this.config.maxInpMs || 200}ms\` | ${inpStatus} |\n`;
    }

    if (result.violations.length > 0) {
      md += `\n> ⚠️ **Performance Budget Remediation:**\n`;
      for (const v of result.violations) {
        md += `> - **[${v.metric}]** ${v.recommendation}\n`;
      }
    }

    return md;
  }
}

export const globalCoreWebVitalsGate = new CoreWebVitalsGatekeeper();
