/**
 * Multi-File Patch Synthesizer & Dependency Diff Resolver (Contribution 11)
 *
 * Coordinates multi-file unified diff creation, parsing, dependency ordering,
 * and manifest generation for multi-component self-healing workflows.
 */

import type {
  MultiFilePatchProposal,
  MultiFilePatchManifestItem,
  CandidatePatchProposal,
} from '../types/patch-proposal.ts';

export interface FileDiffEntry {
  filePath: string;
  diffContent: string;
}

export class MultiFileSynthesizer {
  /**
   * Combines individual file diffs into a unified multi-file patch.
   */
  public static combineDiffs(entries: FileDiffEntry[]): string {
    const combinedParts: string[] = [];

    for (const entry of entries) {
      const cleanPath = entry.filePath.replace(/\\/g, '/').replace(/^\/+/, '');
      let diff = entry.diffContent.trim();

      // Ensure standard header prefixes
      if (!diff.startsWith('--- a/')) {
        diff = `--- a/${cleanPath}\n+++ b/${cleanPath}\n${diff}`;
      }

      combinedParts.push(diff);
    }

    return combinedParts.join('\n\n');
  }

  /**
   * Splits a multi-file unified diff into a map of individual file diffs.
   */
  public static splitMultiFileDiff(unifiedDiff: string): Map<string, string> {
    const fileDiffMap = new Map<string, string>();
    const lines = unifiedDiff.split('\n');

    let currentFile: string | null = null;
    let currentHunkLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('--- a/')) {
        if (currentFile && currentHunkLines.length > 0) {
          fileDiffMap.set(currentFile, currentHunkLines.join('\n'));
        }
        currentFile = line.substring(6).trim();
        currentHunkLines = [line];
      } else if (currentFile) {
        currentHunkLines.push(line);
      }
    }

    if (currentFile && currentHunkLines.length > 0) {
      fileDiffMap.set(currentFile, currentHunkLines.join('\n'));
    }

    return fileDiffMap;
  }

  /**
   * Builds an affected file manifest analyzing modification type and complexity.
   */
  public static buildManifest(fileDiffMap: Map<string, string>): MultiFilePatchManifestItem[] {
    const manifest: MultiFilePatchManifestItem[] = [];

    for (const [filePath, diff] of fileDiffMap.entries()) {
      const hunkMatches = diff.match(/@@ -\d+,\d+ \+\d+,\d+ @@/g) || [];
      const lines = diff.split('\n');
      const linesAdded = lines.filter((l) => l.startsWith('+') && !l.startsWith('+++')).length;
      const linesDeleted = lines.filter((l) => l.startsWith('-') && !l.startsWith('---')).length;

      let changeType: 'modify' | 'create' | 'delete' = 'modify';
      if (linesDeleted === 0 && linesAdded > 0 && diff.includes('@@ -0,0 +1,')) {
        changeType = 'create';
      } else if (linesAdded === 0 && linesDeleted > 0) {
        changeType = 'delete';
      }

      const complexity = Math.min(10, Math.ceil((linesAdded + linesDeleted) / 10) + hunkMatches.length);

      manifest.push({
        path: filePath,
        changeType,
        diffHunksCount: Math.max(1, hunkMatches.length),
        estimatedComplexity: complexity,
      });
    }

    return manifest;
  }

  /**
   * Synthesizes a structured MultiFilePatchProposal from candidate proposals.
   */
  public static createProposal(
    proposalId: string,
    runId: string,
    candidates: CandidatePatchProposal[],
    selectedCandidateId: string
  ): MultiFilePatchProposal {
    const selected = candidates.find((c) => c.id === selectedCandidateId) || candidates[0];
    const diffMap = this.splitMultiFileDiff(selected ? selected.unifiedDiff : '');
    const manifest = this.buildManifest(diffMap);

    const coordinationSummary = `Coordinated multi-file patch spanning ${manifest.length} file(s): ${manifest.map((m) => `${m.path} (${m.changeType})`).join(', ')}.`;

    return {
      proposalId,
      runId,
      candidates,
      selectedCandidateId: selected ? selected.id : '',
      coordinationSummary,
      affectedFileManifest: manifest,
      createdAt: new Date().toISOString(),
    };
  }
}
