import fs from 'fs';
import path from 'path';
import { db } from '../db';
import { BaselineRecord } from '../types/visual-regression';

const DATA_DIR = path.join(process.cwd(), 'data');
const BASELINES_FILE = path.join(DATA_DIR, 'baseline_history.json');

let inMemoryBaselines: BaselineRecord[] | null = null;
let writeQueue: Promise<void> = Promise.resolve();

async function loadBaselines(): Promise<BaselineRecord[]> {
  if (inMemoryBaselines) return inMemoryBaselines;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(BASELINES_FILE)) {
    inMemoryBaselines = [];
    fs.writeFileSync(BASELINES_FILE, JSON.stringify([], null, 2), 'utf-8');
    return inMemoryBaselines;
  }

  try {
    const raw = fs.readFileSync(BASELINES_FILE, 'utf-8');
    inMemoryBaselines = JSON.parse(raw);
    return inMemoryBaselines!;
  } catch (err) {
    console.error('Error reading baseline_history.json, recreating empty store:', err);
    inMemoryBaselines = [];
    return inMemoryBaselines;
  }
}

async function persistBaselines(): Promise<void> {
  if (!inMemoryBaselines) return;
  const snapshot = JSON.stringify(inMemoryBaselines, null, 2);
  const tempFile = `${BASELINES_FILE}.${Date.now()}.tmp`;

  writeQueue = writeQueue.then(async () => {
    try {
      await fs.promises.writeFile(tempFile, snapshot, 'utf-8');
      await fs.promises.rename(tempFile, BASELINES_FILE);
    } catch (err) {
      console.error('Failed to persist baseline records:', err);
      try {
        if (fs.existsSync(tempFile)) await fs.promises.unlink(tempFile);
      } catch {}
    }
  });

  await writeQueue;
}

export interface SetBaselineOptions {
  setBy?: string;
  reason?: string;
  auditSignature?: string;
}

/**
 * Designates a completed verification run as the active visual baseline for a project.
 */
export async function setProjectBaseline(
  projectId: string,
  runId: string,
  options: SetBaselineOptions = {}
): Promise<BaselineRecord> {
  const project = await db.getProjectById(projectId);
  if (!project) {
    throw new Error(`Project with ID "${projectId}" not found.`);
  }

  const run = await db.getRunById(runId);
  if (!run) {
    throw new Error(`Verification run "${runId}" not found.`);
  }

  if (run.projectId !== projectId) {
    throw new Error(`Verification run "${runId}" does not belong to project "${projectId}".`);
  }

  if (run.status !== 'completed') {
    throw new Error(
      `Cannot set run "${runId}" as baseline: run status is "${run.status}". Only successfully "completed" runs may serve as visual baselines.`
    );
  }

  const records = await loadBaselines();

  // Supersede existing active baseline for this project
  for (const record of records) {
    if (record.projectId === projectId && record.isActive) {
      record.isActive = false;
      record.approvalStatus = 'superseded';
    }
  }

  const now = new Date().toISOString();
  const newBaseline: BaselineRecord = {
    id: `base_${projectId}_${Date.now()}`,
    projectId,
    runId: run.id,
    runNumber: run.runNumber,
    commitHash: run.commitHash,
    branch: run.branch,
    setAt: now,
    setBy: options.setBy || 'Authorized Developer',
    isActive: true,
    approvalStatus: 'approved',
    approvalComment: options.reason || `Designated run #${run.runNumber} (${run.commitHash.slice(0, 7)}) as active visual baseline.`,
    approvedBy: options.setBy || 'Authorized Developer',
    approvedAt: now,
    auditSignature: options.auditSignature || `sha256:${Buffer.from(`${run.id}:${now}:${run.commitHash}`).toString('base64url').slice(0, 32)}`,
  };

  records.unshift(newBaseline);
  await persistBaselines();

  return newBaseline;
}

/**
 * Replaces the active baseline for a project with another completed run.
 */
export async function replaceProjectBaseline(
  projectId: string,
  newRunId: string,
  options: SetBaselineOptions = {}
): Promise<{ previous: BaselineRecord | null; current: BaselineRecord }> {
  const previous = await getActiveProjectBaseline(projectId);
  const current = await setProjectBaseline(projectId, newRunId, {
    setBy: options.setBy,
    reason: options.reason || `Replaced baseline ${previous ? `#${previous.runNumber}` : 'none'} with run ${newRunId}`,
  });

  return { previous, current };
}

/**
 * Returns the currently active baseline record for a given project.
 */
export async function getActiveProjectBaseline(
  projectId: string
): Promise<BaselineRecord | null> {
  const records = await loadBaselines();
  const active = records.find((r) => r.projectId === projectId && r.isActive);
  if (active) return active;

  // Fallback: If no explicit baseline history has been set yet, check if project has completed runs
  const runs = await db.getRuns(projectId);
  const completedRuns = runs.filter((r) => r.status === 'completed');
  if (completedRuns.length > 0) {
    // Automatically designate earliest or benchmark completed run as initial baseline
    const fallbackRun = completedRuns[completedRuns.length - 1]; // First completed run
    return setProjectBaseline(projectId, fallbackRun.id, {
      setBy: 'System (Default Initial Run)',
      reason: 'Automatic default benchmark initialized from first completed run.',
    });
  }

  return null;
}

/**
 * Returns the complete chronological history of all baseline changes for a project.
 */
export async function getProjectBaselineHistory(
  projectId: string
): Promise<BaselineRecord[]> {
  const records = await loadBaselines();
  return records.filter((r) => r.projectId === projectId);
}

/**
 * Resets baseline storage (used in test isolation).
 */
export async function clearBaselineStore(): Promise<void> {
  inMemoryBaselines = [];
  if (fs.existsSync(BASELINES_FILE)) {
    await fs.promises.unlink(BASELINES_FILE).catch(() => {});
  }
}
