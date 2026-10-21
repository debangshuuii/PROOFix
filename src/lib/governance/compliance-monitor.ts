/**
 * Continuous Compliance Monitoring & Drift Alerting (Contribution 179)
 *
 * Implements continuous SOC2 compliance heartbeats to detect configuration drift,
 * audit chain tampering, unmasked secrets, and perimeter firewall regressions.
 */

import crypto from 'crypto';
import type { Soc2TrustCriterion } from '../types/governance-compliance.ts';
import type { SeverityLevel } from '../types/index.ts';
import { CryptographicAuditLedger } from './audit-ledger.ts';
import { Soc2ComplianceEvaluator } from './soc2-evaluator.ts';

export interface ComplianceDriftAlert {
  id: string;
  criterion: Soc2TrustCriterion;
  severity: SeverityLevel;
  title: string;
  description: string;
  detectedAt: string;
  remediationAdvice: string;
}

export class ContinuousComplianceMonitor {
  private auditLedger: CryptographicAuditLedger;
  private evaluator: Soc2ComplianceEvaluator;
  private alertListeners: Array<(alert: ComplianceDriftAlert) => void> = [];
  private pollTimer?: NodeJS.Timeout;
  private activeAlerts: Map<string, ComplianceDriftAlert> = new Map();

  constructor(auditLedger?: CryptographicAuditLedger, evaluator?: Soc2ComplianceEvaluator) {
    this.auditLedger = auditLedger || new CryptographicAuditLedger();
    this.evaluator = evaluator || new Soc2ComplianceEvaluator(this.auditLedger);
  }

  public onAlert(listener: (alert: ComplianceDriftAlert) => void): () => void {
    this.alertListeners.push(listener);
    return () => {
      this.alertListeners = this.alertListeners.filter((l) => l !== listener);
    };
  }

  /**
   * Evaluates system controls for compliance drift.
   */
  public async checkDrift(): Promise<ComplianceDriftAlert[]> {
    const report = await this.evaluator.evaluateCompliance();
    const alerts: ComplianceDriftAlert[] = [];
    const now = new Date().toISOString();

    // 1. Check Cryptographic Ledger Integrity
    if (!report.tamperProofChainVerified) {
      const alert: ComplianceDriftAlert = {
        id: `drift_ledger_${Date.now()}`,
        criterion: 'CC6.1_Access_Security',
        severity: 'critical',
        title: 'Cryptographic Audit Ledger Tampering Detected',
        description: 'SHA-256 Merkle hash chain link broken or retrospective record modification detected.',
        detectedAt: now,
        remediationAdvice: 'Immediately isolate affected database nodes and verify write-ahead logs.',
      };
      alerts.push(alert);
      this.broadcastAlert(alert);
    }

    // 2. Check for Non-compliant or Warning Controls
    for (const finding of report.findings) {
      if (finding.status !== 'compliant') {
        const alert: ComplianceDriftAlert = {
          id: `drift_${finding.criterion}_${Date.now()}`,
          criterion: finding.criterion,
          severity: finding.status === 'non_compliant' ? 'critical' : 'medium',
          title: `SOC2 Control Regression: ${finding.name}`,
          description: finding.evidenceSummary,
          detectedAt: now,
          remediationAdvice: finding.remediationAdvice || 'Restore standard SOC2 security policy configuration.',
        };
        alerts.push(alert);
        this.broadcastAlert(alert);
      }
    }

    return alerts;
  }

  private broadcastAlert(alert: ComplianceDriftAlert): void {
    this.activeAlerts.set(alert.id, alert);

    // Record alert in audit ledger
    this.auditLedger.append({
      actorId: 'compliance-monitor',
      actorRole: 'security_auditor',
      tenantId: 'system',
      action: 'compliance:drift_detected',
      resourceType: 'soc2_control',
      resourceId: alert.criterion,
      details: { title: alert.title, severity: alert.severity },
    });

    for (const listener of this.alertListeners) {
      try {
        listener(alert);
      } catch {
        // Safe listener error suppression
      }
    }
  }

  public startMonitoring(intervalMs: number = 60000): void {
    if (this.pollTimer) return;
    this.pollTimer = setInterval(async () => {
      await this.checkDrift();
    }, intervalMs);
  }

  public stopMonitoring(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }
  }

  public getActiveAlerts(): ComplianceDriftAlert[] {
    return Array.from(this.activeAlerts.values());
  }
}
