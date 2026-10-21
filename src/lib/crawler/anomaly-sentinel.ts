/**
 * Real-Time Anomaly & Zero-Day Detection Sentinel (Contribution 225)
 *
 * Monitors browser execution during autonomous crawling for uncaught JS errors,
 * unhandled promise rejections, HTTP 500s, layout overflows, and unresponsive states.
 */

import type {
  CrawlerAnomaly,
  CrawlerAction,
  ChaosAnomalySeverity,
} from '../types/chaos-crawler.ts';

export class AnomalySentinel {
  private anomalies: CrawlerAnomaly[] = [];

  /**
   * Records an uncaught JavaScript runtime exception.
   */
  public recordException(
    message: string,
    stack?: string,
    url: string = 'unknown',
    action?: CrawlerAction,
    stateHash: string = 'root'
  ): CrawlerAnomaly {
    const anomaly: CrawlerAnomaly = {
      id: `anom-err-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: 'uncaught_exception',
      severity: 'critical',
      message: message.trim(),
      url,
      stateHash,
      actionTriggered: action || { type: 'navigate', rationale: 'Initial page load' },
      stackTrace: stack,
      timestamp: new Date().toISOString(),
    };

    this.anomalies.push(anomaly);
    return anomaly;
  }

  /**
   * Records an unhandled promise rejection.
   */
  public recordUnhandledRejection(
    reason: string,
    url: string = 'unknown',
    action?: CrawlerAction,
    stateHash: string = 'root'
  ): CrawlerAnomaly {
    const anomaly: CrawlerAnomaly = {
      id: `anom-rej-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: 'unhandled_rejection',
      severity: 'high',
      message: `Unhandled Promise Rejection: ${reason.trim()}`,
      url,
      stateHash,
      actionTriggered: action || { type: 'navigate', rationale: 'Async action' },
      timestamp: new Date().toISOString(),
    };

    this.anomalies.push(anomaly);
    return anomaly;
  }

  /**
   * Records an HTTP server error (500, 502, 503, 504) or dead link (404).
   */
  public recordHttpFailure(
    status: number,
    url: string,
    action?: CrawlerAction,
    stateHash: string = 'root'
  ): CrawlerAnomaly | null {
    if (status < 400) return null;

    const isServerError = status >= 500;
    const severity: ChaosAnomalySeverity = isServerError ? 'critical' : status === 404 ? 'medium' : 'low';
    const type = isServerError ? 'http_server_error' : 'broken_link_404';

    const anomaly: CrawlerAnomaly = {
      id: `anom-http-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type,
      severity,
      message: `HTTP ${status} response encountered on ${url}`,
      url,
      stateHash,
      actionTriggered: action || { type: 'navigate', rationale: 'HTTP request dispatch' },
      timestamp: new Date().toISOString(),
    };

    this.anomalies.push(anomaly);
    return anomaly;
  }

  /**
   * Records a responsive layout horizontal overflow violation.
   */
  public recordLayoutOverflow(
    scrollWidth: number,
    innerWidth: number,
    url: string,
    action?: CrawlerAction,
    stateHash: string = 'root'
  ): CrawlerAnomaly | null {
    if (scrollWidth <= innerWidth + 2) {
      return null; // within acceptable tolerance
    }

    const delta = scrollWidth - innerWidth;
    const anomaly: CrawlerAnomaly = {
      id: `anom-layout-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: 'layout_overflow',
      severity: delta > 50 ? 'high' : 'medium',
      message: `Horizontal layout overflow detected: scrollWidth (${scrollWidth}px) exceeds innerWidth (${innerWidth}px) by ${delta}px`,
      url,
      stateHash,
      actionTriggered: action || { type: 'trigger_resize', rationale: 'Layout viewport check' },
      timestamp: new Date().toISOString(),
    };

    this.anomalies.push(anomaly);
    return anomaly;
  }

  public getAnomalies(): CrawlerAnomaly[] {
    return [...this.anomalies];
  }

  public hasCriticalAnomalies(): boolean {
    return this.anomalies.some((a) => a.severity === 'critical');
  }

  public clear(): void {
    this.anomalies = [];
  }
}

export const globalAnomalySentinel = new AnomalySentinel();
