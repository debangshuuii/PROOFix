/**
 * Master Migration Orchestrator & Rollback Runner
 *
 * Coordinates automated lock acquisition, manifest loading,
 * SHA-256 verification, forward application, and rollback recovery.
 */

import crypto from 'node:crypto';
import type { IPhysicalDatabaseDriver } from '../types/pluggable-database.ts';
import type { MigrationExecutionReport, MigrationScript } from '../types/migration-manifest.ts';
import { loadAllMigrations } from './migration-checksum.ts';
import { MigrationLockManager } from './migration-lock.ts';
import { MigrationVersionTracker } from './migration-executor.ts';
import { MigrationPlanResolver } from './migration-plan-resolver.ts';

export class MigrationOrchestrator {
  private driver: IPhysicalDatabaseDriver;
  private migrationsDir?: string;
  private lockManager: MigrationLockManager;
  private tracker: MigrationVersionTracker;

  constructor(driver: IPhysicalDatabaseDriver, migrationsDir?: string) {
    this.driver = driver;
    this.migrationsDir = migrationsDir;
    this.lockManager = new MigrationLockManager(driver);
    this.tracker = new MigrationVersionTracker(driver);
  }

  public async up(targetVersion?: number): Promise<MigrationExecutionReport> {
    const start = Date.now();
    const workerId = `worker_${process.pid}_${crypto.randomBytes(4).toString('hex')}`;
    const locked = await this.lockManager.acquireLock(workerId);
    if (!locked) {
      throw new Error('Database migration lock could not be acquired (held by another worker).');
    }

    try {
      const allScripts = loadAllMigrations(this.migrationsDir);
      const applied = await this.tracker.getAppliedMigrations();
      const { plan, checksumMismatches } = MigrationPlanResolver.resolveUpPlan(allScripts, applied);

      if (checksumMismatches.length > 0) {
        return {
          success: false,
          dialect: this.driver.dialect,
          appliedCount: 0,
          rolledBackCount: 0,
          totalExecutionMs: Date.now() - start,
          currentVersion: plan.currentVersion,
          appliedVersions: applied.map((a) => a.version),
          pendingVersions: plan.scriptsToExecute.map((s) => s.version),
          checksumMismatches,
          error: `Checksum verification failed for ${checksumMismatches.length} migration(s). Database schema tampering detected.`,
        };
      }

      const scriptsToRun = targetVersion
        ? plan.scriptsToExecute.filter((s) => s.version <= targetVersion)
        : plan.scriptsToExecute;

      const batchId = await this.tracker.getLatestBatchId();
      const newlyAppliedVersions: number[] = [];

      for (const script of scriptsToRun) {
        await this.tracker.executeMigrationInTransaction(script, batchId);
        newlyAppliedVersions.push(script.version);
      }

      const finalApplied = await this.tracker.getAppliedMigrations();
      const currentVer = finalApplied.length > 0 ? finalApplied[finalApplied.length - 1].version : 0;

      return {
        success: true,
        dialect: this.driver.dialect,
        appliedCount: newlyAppliedVersions.length,
        rolledBackCount: 0,
        totalExecutionMs: Date.now() - start,
        currentVersion: currentVer,
        appliedVersions: finalApplied.map((a) => a.version),
        pendingVersions: [],
        checksumMismatches: [],
      };
    } finally {
      await this.lockManager.releaseLock(workerId);
    }
  }

  public async down(targetVersion: number): Promise<MigrationExecutionReport> {
    const start = Date.now();
    const workerId = `worker_${process.pid}_${crypto.randomBytes(4).toString('hex')}`;
    const locked = await this.lockManager.acquireLock(workerId);
    if (!locked) {
      throw new Error('Database migration lock could not be acquired.');
    }

    try {
      const allScripts = loadAllMigrations(this.migrationsDir);
      const applied = await this.tracker.getAppliedMigrations();
      const plan = MigrationPlanResolver.resolveDownPlan(allScripts, applied, targetVersion);

      const rolledBackVersions: number[] = [];

      for (const script of plan.scriptsToExecute) {
        if (!script.downSql) {
          throw new Error(`Migration ${script.version} does not have a down SQL migration.`);
        }

        const tx = await this.driver.beginTransaction('SERIALIZABLE');
        try {
          const stmts = script.downSql
            .split(';')
            .map((s) => s.trim())
            .filter((s) => s.length > 0 && !s.startsWith('--'));

          for (const stmt of stmts) {
            await tx.execute(stmt);
          }
          await this.tracker.removeMigrationRecord(script.version);
          await tx.commit();
          rolledBackVersions.push(script.version);
        } catch (err) {
          await tx.rollback();
          throw err;
        }
      }

      return {
        success: true,
        dialect: this.driver.dialect,
        appliedCount: 0,
        rolledBackCount: rolledBackVersions.length,
        totalExecutionMs: Date.now() - start,
        currentVersion: targetVersion,
        appliedVersions: applied.map((a) => a.version).filter((v) => v <= targetVersion),
        pendingVersions: rolledBackVersions,
        checksumMismatches: [],
      };
    } finally {
      await this.lockManager.releaseLock(workerId);
    }
  }

  public async getStatus(): Promise<{ currentVersion: number; appliedCount: number; pendingCount: number }> {
    const allScripts = loadAllMigrations(this.migrationsDir);
    const applied = await this.tracker.getAppliedMigrations();
    const { plan } = MigrationPlanResolver.resolveUpPlan(allScripts, applied);

    return {
      currentVersion: plan.currentVersion,
      appliedCount: applied.length,
      pendingCount: plan.scriptsToExecute.length,
    };
  }
}
