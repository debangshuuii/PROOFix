/**
 * Migration Plan Resolver & Checksum Drift Detector
 *
 * Compares discovered migration scripts against database history,
 * validates cryptographic SHA-256 checksums to prevent tampering,
 * and formulates idempotent execution plans.
 */

import type {
  MigrationScript,
  MigrationRecord,
  MigrationPlan,
  ChecksumMismatchErrorDetail,
} from '../types/migration-manifest.ts';

export class MigrationPlanResolver {
  public static resolveUpPlan(
    availableScripts: MigrationScript[],
    appliedMigrations: MigrationRecord[]
  ): { plan: MigrationPlan; checksumMismatches: ChecksumMismatchErrorDetail[] } {
    const appliedMap = new Map<number, MigrationRecord>();
    for (const app of appliedMigrations) {
      appliedMap.set(app.version, app);
    }

    const checksumMismatches: ChecksumMismatchErrorDetail[] = [];
    const pendingScripts: MigrationScript[] = [];

    let currentVersion = 0;
    for (const app of appliedMigrations) {
      if (app.version > currentVersion) {
        currentVersion = app.version;
      }
    }

    for (const script of availableScripts) {
      const applied = appliedMap.get(script.version);
      if (applied) {
        // Validate checksum integrity
        if (applied.checksum_sha256 !== script.checksumSha256) {
          checksumMismatches.push({
            version: script.version,
            name: script.name,
            expectedChecksum: script.checksumSha256,
            storedChecksum: applied.checksum_sha256,
          });
        }
      } else {
        // Not yet applied
        pendingScripts.push(script);
      }
    }

    const targetVersion =
      pendingScripts.length > 0 ? pendingScripts[pendingScripts.length - 1].version : currentVersion;

    return {
      plan: {
        currentVersion,
        targetVersion,
        direction: 'up',
        scriptsToExecute: pendingScripts,
      },
      checksumMismatches,
    };
  }

  public static resolveDownPlan(
    availableScripts: MigrationScript[],
    appliedMigrations: MigrationRecord[],
    targetVersion: number
  ): MigrationPlan {
    const scriptMap = new Map<number, MigrationScript>();
    for (const s of availableScripts) {
      scriptMap.set(s.version, s);
    }

    let currentVersion = 0;
    for (const app of appliedMigrations) {
      if (app.version > currentVersion) {
        currentVersion = app.version;
      }
    }

    // Scripts to rollback: all applied migrations with version > targetVersion in descending order
    const scriptsToRollback: MigrationScript[] = [];
    const sortedAppliedDesc = [...appliedMigrations].sort((a, b) => b.version - a.version);

    for (const app of sortedAppliedDesc) {
      if (app.version > targetVersion) {
        const script = scriptMap.get(app.version);
        if (!script) {
          throw new Error(`Cannot rollback migration ${app.version}: Script file not found on disk.`);
        }
        if (!script.downSql) {
          throw new Error(`Cannot rollback migration ${app.version} (${script.name}): No down migration specified.`);
        }
        scriptsToRollback.push(script);
      }
    }

    return {
      currentVersion,
      targetVersion,
      direction: 'down',
      scriptsToExecute: scriptsToRollback,
    };
  }
}
