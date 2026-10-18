import crypto from 'crypto';
import { db } from '../db';
import { BaselineRecord } from '../types/visual-regression';
import {
  getActiveProjectBaseline,
  getProjectBaselineHistory,
  setProjectBaseline,
} from './baseline-manager';

export interface BaselineApprovalRequest {
  projectId: string;
  runId: string;
  approverName: string;
  approverEmail?: string;
  comment?: string;
}

export interface BaselineAuditEntry {
  auditId: string;
  projectId: string;
  runId: string;
  runNumber: number;
  commitHash: string;
  action: 'approve' | 'reject' | 'promote' | 'supersede';
  approvedBy: string;
  approvedAt: string;
  comment: string;
  checksum: string;
}

/**
 * Computes a verifiable cryptographic signature for a baseline approval record.
 */
export function generateAuditChecksum(
  projectId: string,
  runId: string,
  commitHash: string,
  approvedBy: string,
  timestamp: string
): string {
  const payload = `${projectId}:${runId}:${commitHash}:${approvedBy}:${timestamp}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Approves a verification run as an authorized visual baseline with complete audit metadata.
 */
export async function approveRunAsBaseline(
  req: BaselineApprovalRequest
): Promise<{ baseline: BaselineRecord; auditEntry: BaselineAuditEntry }> {
  const { projectId, runId, approverName, approverEmail, comment } = req;

  if (!approverName || approverName.trim() === '') {
    throw new Error('Approver name is required for authorized baseline sign-off.');
  }

  const run = await db.getRunById(runId);
  if (!run) {
    throw new Error(`Verification run "${runId}" not found.`);
  }

  if (run.status !== 'completed') {
    throw new Error(
      `Cannot approve incomplete run "${runId}" (status: "${run.status}"). Only completed runs can be approved as baselines.`
    );
  }

  const now = new Date().toISOString();
  const approverLabel = approverEmail ? `${approverName} <${approverEmail}>` : approverName;
  const checksum = generateAuditChecksum(projectId, run.id, run.commitHash, approverLabel, now);

  const baseline = await setProjectBaseline(projectId, runId, {
    setBy: approverLabel,
    reason: comment || `Authorized approval of run #${run.runNumber} (${run.commitHash.slice(0, 7)}) as visual baseline.`,
    auditSignature: checksum,
  });

  const auditEntry: BaselineAuditEntry = {
    auditId: `audit_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
    projectId,
    runId: run.id,
    runNumber: run.runNumber,
    commitHash: run.commitHash,
    action: 'approve',
    approvedBy: approverLabel,
    approvedAt: now,
    comment: comment || 'Official baseline sign-off.',
    checksum,
  };

  return { baseline, auditEntry };
}

/**
 * Retrieves the auditable baseline history and verification signatures for a project.
 */
export async function getBaselineAuditTrail(
  projectId: string
): Promise<{
  activeBaseline: BaselineRecord | null;
  history: BaselineRecord[];
  auditEntries: BaselineAuditEntry[];
}> {
  const activeBaseline = await getActiveProjectBaseline(projectId);
  const history = await getProjectBaselineHistory(projectId);

  const auditEntries: BaselineAuditEntry[] = history.map((record) => ({
    auditId: `audit_${record.id}`,
    projectId: record.projectId,
    runId: record.runId,
    runNumber: record.runNumber,
    commitHash: record.commitHash,
    action: record.isActive ? 'approve' : 'supersede',
    approvedBy: record.approvedBy || record.setBy,
    approvedAt: record.approvedAt || record.setAt,
    comment: record.approvalComment || '',
    checksum: record.auditSignature || 'legacy_signature',
  }));

  return {
    activeBaseline,
    history,
    auditEntries,
  };
}
