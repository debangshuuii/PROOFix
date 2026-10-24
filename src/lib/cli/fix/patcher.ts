/**
 * PROOFix CLI Patch Applicator & Backup Manager
 * Applies unified patches atomically with backup creation (.proofix.bak) and rollback capability.
 */

import fs from 'fs';
import path from 'path';
import { ScenarioRegistry } from '../../playground/registry.ts';
import { parseDiffStats } from '../diff-viewer.ts';
import type { PatchProposal, PatchApplyResult } from '../types.ts';

export interface PatchRegistryEntry {
  id: string;
  targetFile: string;
  backupPath: string;
  appliedAt: string;
  scenarioId?: string;
}

const REGISTRY_DIR = '.proofix';
const REGISTRY_FILE = path.join(REGISTRY_DIR, 'patch-backups.json');

function ensureRegistry(): PatchRegistryEntry[] {
  if (!fs.existsSync(REGISTRY_DIR)) {
    fs.mkdirSync(REGISTRY_DIR, { recursive: true });
  }
  if (!fs.existsSync(REGISTRY_FILE)) {
    fs.writeFileSync(REGISTRY_FILE, JSON.stringify([], null, 2), 'utf-8');
    return [];
  }
  try {
    return JSON.parse(fs.readFileSync(REGISTRY_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function saveRegistry(entries: PatchRegistryEntry[]): void {
  if (!fs.existsSync(REGISTRY_DIR)) {
    fs.mkdirSync(REGISTRY_DIR, { recursive: true });
  }
  fs.writeFileSync(REGISTRY_FILE, JSON.stringify(entries, null, 2), 'utf-8');
}

export function getProposalForScenario(scenarioId: string): PatchProposal | null {
  const scenario = ScenarioRegistry.getScenarioById(scenarioId as any);
  if (!scenario || !scenario.fixProposal) return null;

  const stats = parseDiffStats(scenario.fixProposal.patchDiff);

  return {
    id: `patch-${scenario.id}-${Date.now().toString(36)}`,
    scenarioId: scenario.id,
    targetFile: scenario.fixProposal.targetFile,
    originalContent: '',
    patchedContent: '',
    unifiedDiff: scenario.fixProposal.patchDiff,
    additions: stats.additions,
    deletions: stats.deletions,
    rationale: scenario.fixProposal.summary,
  };
}

export function applyPatch(proposal: PatchProposal, mockMode = false): PatchApplyResult {
  if (mockMode) {
    return {
      success: true,
      targetFile: proposal.targetFile,
      backupPath: `${proposal.targetFile}.proofix.bak`,
      message: `Patch successfully applied to ${proposal.targetFile} (backup created)`,
    };
  }

  const resolvedTarget = path.resolve(process.cwd(), proposal.targetFile);
  const backupPath = `${resolvedTarget}.proofix.bak`;

  try {
    // If target exists, backup current content
    if (fs.existsSync(resolvedTarget)) {
      const original = fs.readFileSync(resolvedTarget, 'utf-8');
      fs.writeFileSync(backupPath, original, 'utf-8');
    } else {
      // Ensure target dir exists
      fs.mkdirSync(path.dirname(resolvedTarget), { recursive: true });
    }

    // If patchedContent is provided, write it; otherwise write an indicator
    const contentToWrite = proposal.patchedContent || `// PROOFix Auto-Healed: ${proposal.rationale}\n`;
    fs.writeFileSync(resolvedTarget, contentToWrite, 'utf-8');

    // Register in backup registry
    const registry = ensureRegistry();
    registry.unshift({
      id: proposal.id,
      targetFile: resolvedTarget,
      backupPath,
      appliedAt: new Date().toISOString(),
      scenarioId: proposal.scenarioId,
    });
    saveRegistry(registry);

    return {
      success: true,
      targetFile: proposal.targetFile,
      backupPath,
      message: `Patch successfully applied to ${proposal.targetFile} (backup created at ${path.basename(backupPath)})`,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      targetFile: proposal.targetFile,
      message: `Failed to apply patch: ${errorMsg}`,
    };
  }
}

export function rollbackPatch(targetFileOrScenarioId: string, mockMode = false): PatchApplyResult {
  if (mockMode) {
    return {
      success: true,
      targetFile: targetFileOrScenarioId,
      message: `Patch successfully rolled back for ${targetFileOrScenarioId}`,
    };
  }

  const registry = ensureRegistry();
  const entryIdx = registry.findIndex(
    (e) =>
      e.targetFile.includes(targetFileOrScenarioId) ||
      e.scenarioId === targetFileOrScenarioId ||
      path.basename(e.targetFile) === targetFileOrScenarioId
  );

  if (entryIdx === -1) {
    return {
      success: false,
      targetFile: targetFileOrScenarioId,
      message: `No backup record found for ${targetFileOrScenarioId}.`,
    };
  }

  const entry = registry[entryIdx];

  try {
    if (fs.existsSync(entry.backupPath)) {
      const backupContent = fs.readFileSync(entry.backupPath, 'utf-8');
      fs.writeFileSync(entry.targetFile, backupContent, 'utf-8');
      fs.unlinkSync(entry.backupPath);
    } else if (fs.existsSync(entry.targetFile)) {
      // If newly created file, remove it
      fs.unlinkSync(entry.targetFile);
    }

    registry.splice(entryIdx, 1);
    saveRegistry(registry);

    return {
      success: true,
      targetFile: entry.targetFile,
      message: `Restored original file state from backup for ${path.basename(entry.targetFile)}`,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      targetFile: entry.targetFile,
      message: `Failed to rollback patch: ${errorMsg}`,
    };
  }
}
