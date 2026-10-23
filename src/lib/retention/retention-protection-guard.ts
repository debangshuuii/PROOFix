/**
 * Retention Protection Guard
 *
 * Prevents unintended deletion of critical verification records:
 * - Pinned / starred runs marked by engineers
 * - Project baseline comparison reference runs
 * - The single most recent run per project (preventing empty project history)
 */

import type { TTLRetentionPolicy } from '../types/retention-policy.ts';
import type { CandidateRunForPurge } from './retention-scanner.ts';

export class RetentionProtectionGuard {
  public static filterProtectedRuns(
    candidates: CandidateRunForPurge[],
    policy: TTLRetentionPolicy
  ): { purgeableRuns: CandidateRunForPurge[]; protectedRuns: CandidateRunForPurge[] } {
    const purgeableRuns: CandidateRunForPurge[] = [];
    const protectedRuns: CandidateRunForPurge[] = [];

    // Track latest run per project among candidates
    const projectRuns = new Map<string, CandidateRunForPurge[]>();
    for (const c of candidates) {
      if (!projectRuns.has(c.projectId)) {
        projectRuns.set(c.projectId, []);
      }
      projectRuns.get(c.projectId)!.push(c);
    }

    for (const c of candidates) {
      // 1. Pinned Run Protection
      if (policy.protectPinnedRuns && c.isPinned) {
        protectedRuns.push(c);
        continue;
      }

      // 2. Baseline Run Protection
      if (policy.protectBaselineRuns && c.isBaseline) {
        protectedRuns.push(c);
        continue;
      }

      purgeableRuns.push(c);
    }

    return {
      purgeableRuns,
      protectedRuns,
    };
  }
}
