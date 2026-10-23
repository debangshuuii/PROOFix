/**
 * Retention Cascade Purger & Disk Reclaimer
 *
 * Atomically deletes expired verification runs and performs cascade deletion
 * of associated test results, findings, repair proposals, and physical disk artifacts.
 */

import fs from 'node:fs';
import path from 'node:path';
import type { IPhysicalDatabaseDriver } from '../types/pluggable-database.ts';
import type { PurgedRecordSummary, TTLRetentionPolicy } from '../types/retention-policy.ts';

export class RetentionCascadePurger {
  private driver: IPhysicalDatabaseDriver;

  constructor(driver: IPhysicalDatabaseDriver) {
    this.driver = driver;
  }

  public async purgeRunsCascade(
    runIds: string[],
    policy: TTLRetentionPolicy
  ): Promise<PurgedRecordSummary> {
    const summary: PurgedRecordSummary = {
      runsCount: 0,
      testResultsCount: 0,
      findingsCount: 0,
      artifactsCount: 0,
      proposalsCount: 0,
      diskFilesDeleted: 0,
      diskBytesReclaimed: 0,
    };

    if (runIds.length === 0) {
      return summary;
    }

    // 1. Gather disk artifact file paths if disk cleanup is enabled
    const artifactFiles: string[] = [];
    if (policy.deleteDiskArtifacts && !policy.dryRun) {
      for (const runId of runIds) {
        const artRes = await this.driver.query<{ file_path: string }>(
          `SELECT file_path FROM proofix_artifacts WHERE run_id = ?;`,
          [runId]
        );
        for (const row of artRes.rows) {
          if (row.file_path) {
            artifactFiles.push(row.file_path);
          }
        }
      }
    }

    if (policy.dryRun) {
      summary.runsCount = runIds.length;
      return summary;
    }

    // 2. Perform transactional database cascade purge
    const tx = await this.driver.beginTransaction('SERIALIZABLE');
    try {
      for (const runId of runIds) {
        // Artifacts
        const artDel = await tx.execute(`DELETE FROM proofix_artifacts WHERE run_id = ?;`, [runId]);
        summary.artifactsCount += artDel.changes;

        // Patch transactions & Repair proposals
        const propDel = await tx.execute(`DELETE FROM proofix_repair_proposals WHERE run_id = ?;`, [runId]);
        summary.proposalsCount += propDel.changes;

        // Findings
        const findDel = await tx.execute(`DELETE FROM proofix_findings WHERE run_id = ?;`, [runId]);
        summary.findingsCount += findDel.changes;

        // Test results
        const testDel = await tx.execute(`DELETE FROM proofix_test_results WHERE run_id = ?;`, [runId]);
        summary.testResultsCount += testDel.changes;

        // Verification run
        const runDel = await tx.execute(`DELETE FROM proofix_verification_runs WHERE id = ?;`, [runId]);
        summary.runsCount += runDel.changes;
      }

      await tx.commit();
    } catch (err) {
      await tx.rollback();
      throw err;
    }

    // 3. Delete physical files from disk
    if (policy.deleteDiskArtifacts) {
      for (const filePath of artifactFiles) {
        try {
          const absPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
          if (fs.existsSync(absPath)) {
            const stats = fs.statSync(absPath);
            summary.diskBytesReclaimed += stats.size;
            fs.unlinkSync(absPath);
            summary.diskFilesDeleted++;
          }
        } catch {
          // Continue if file already missing or locked
        }
      }
    }

    return summary;
  }
}
