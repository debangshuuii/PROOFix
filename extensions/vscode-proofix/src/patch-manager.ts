import fs from 'fs';
import path from 'path';
import { ProposedPatch } from './types';

/**
 * Manages side-by-side patch diff previewing, atomic patch application, and automatic rollback.
 */
export class PatchManager {
  private proposals = new Map<string, ProposedPatch>();

  public storeProposal(proposal: ProposedPatch): void {
    this.proposals.set(proposal.proposalId, proposal);
  }

  public getProposal(proposalId: string): ProposedPatch | undefined {
    return this.proposals.get(proposalId);
  }

  public getProposalForFile(filePath: string): ProposedPatch | undefined {
    const normalized = filePath.replace(/\\/g, '/');
    for (const p of this.proposals.values()) {
      if (p.targetFile.replace(/\\/g, '/') === normalized) {
        return p;
      }
    }
    return undefined;
  }

  /**
   * Applies patch content atomically with automatic backup file creation.
   */
  public applyPatch(proposalId: string): { success: boolean; backupPath?: string; error?: string } {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      return { success: false, error: `Proposal not found: ${proposalId}` };
    }

    const targetFile = path.resolve(proposal.targetFile);
    if (!fs.existsSync(targetFile)) {
      return { success: false, error: `Target file does not exist: ${targetFile}` };
    }

    try {
      const currentContent = fs.readFileSync(targetFile, 'utf-8');
      const backupPath = `${targetFile}.proofix.bak`;

      // 1. Create backup
      fs.writeFileSync(backupPath, currentContent, 'utf-8');

      // 2. Write proposed patch content
      fs.writeFileSync(targetFile, proposal.patchedContent, 'utf-8');

      return {
        success: true,
        backupPath,
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Restores target file from its .proofix.bak backup.
   */
  public rollbackPatch(targetFilePath: string): { success: boolean; error?: string } {
    const targetFile = path.resolve(targetFilePath);
    const backupPath = `${targetFile}.proofix.bak`;

    if (!fs.existsSync(backupPath)) {
      return { success: false, error: `No backup file found at: ${backupPath}` };
    }

    try {
      const backupContent = fs.readFileSync(backupPath, 'utf-8');
      fs.writeFileSync(targetFile, backupContent, 'utf-8');
      fs.unlinkSync(backupPath); // Remove backup after successful restore
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public clear(): void {
    this.proposals.clear();
  }
}

/**
 * Formats title for the split-screen VS Code diff editor tab.
 */
export function formatDiffPreviewTitle(targetFile: string): string {
  const base = path.basename(targetFile);
  return `PROOFix Proposed Fix: ${base} ↔ Current`;
}

/**
 * Returns arguments formatted for `vscode.commands.executeCommand('vscode.diff', ...)`.
 */
export function getDiffViewerArgs(proposal: ProposedPatch): {
  originalUri: string;
  proposedUri: string;
  title: string;
} {
  return {
    originalUri: proposal.targetFile,
    proposedUri: `${proposal.targetFile}.proofix-preview`,
    title: formatDiffPreviewTitle(proposal.targetFile),
  };
}
