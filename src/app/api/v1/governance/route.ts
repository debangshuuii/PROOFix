/**
 * Governance & SOC2 Compliance REST API Route (Contribution 177)
 *
 * GET /api/v1/governance - Retrieves audit logs, integrity status, and SOC2 report.
 * POST /api/v1/governance - Evaluates SOC2 controls, exports evidence packages, or logs audits.
 */

import { NextResponse } from 'next/server';
import { CryptographicAuditLedger } from '@/lib/governance/audit-ledger';
import { Soc2ComplianceEvaluator } from '@/lib/governance/soc2-evaluator';
import { EvidenceCollector } from '@/lib/governance/evidence-collector';

// Global singleton instances for API lifecycle
const globalAuditLedger = new CryptographicAuditLedger();
const globalEvaluator = new Soc2ComplianceEvaluator(globalAuditLedger);
const globalEvidenceCollector = new EvidenceCollector(globalAuditLedger, globalEvaluator);

// Seed initial system audit entry if empty
if (globalAuditLedger.getEntries().length === 0) {
  globalAuditLedger.append({
    actorId: 'system-init',
    actorRole: 'super_admin',
    tenantId: 'system',
    action: 'governance:initialized',
    resourceType: 'platform',
    resourceId: 'node-cluster',
    details: { environment: 'production', soc2_tier: 'Type II' },
  });
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const tenantId = url.searchParams.get('tenantId') || undefined;

    const report = await globalEvaluator.evaluateCompliance();
    const auditEntries = globalAuditLedger.getEntries(tenantId);
    const integrity = globalAuditLedger.verifyLedgerIntegrity();

    return NextResponse.json({
      success: true,
      report,
      auditLedger: {
        totalEntries: auditEntries.length,
        integrity,
        latestHash: globalAuditLedger.getLatestHash(),
        entries: auditEntries.slice(-50), // Last 50 entries
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, tenantId = 'default', auditEntry } = body;

    switch (action) {
      case 'evaluate_soc2': {
        const report = await globalEvaluator.evaluateCompliance();
        return NextResponse.json({
          success: true,
          report,
        });
      }

      case 'export_evidence': {
        const manifest = await globalEvidenceCollector.generateEvidencePackage(tenantId);
        return NextResponse.json({
          success: true,
          manifest,
        });
      }

      case 'append_audit': {
        if (!auditEntry || !auditEntry.actorId || !auditEntry.action) {
          return NextResponse.json(
            { success: false, error: 'Missing required audit entry fields' },
            { status: 400 }
          );
        }

        const entry = globalAuditLedger.append({
          actorId: auditEntry.actorId,
          actorRole: auditEntry.actorRole || 'developer',
          tenantId: auditEntry.tenantId || tenantId,
          action: auditEntry.action,
          resourceType: auditEntry.resourceType || 'general',
          resourceId: auditEntry.resourceId || 'res-01',
          clientIp: auditEntry.clientIp,
          details: auditEntry.details || {},
        });

        return NextResponse.json({
          success: true,
          entry,
          latestHash: globalAuditLedger.getLatestHash(),
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Invalid action: ${action}` },
          { status: 400 }
        );
    }
  } catch (err) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
