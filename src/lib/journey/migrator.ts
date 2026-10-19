import { UserJourney, JourneySchemaVersion } from '../types/journey';
import { assertValidJourney, CURRENT_SCHEMA_VERSION } from './schema-validator';

export interface MigrationResult {
  migrated: boolean;
  fromVersion: string;
  toVersion: JourneySchemaVersion;
  journey: UserJourney;
  changesApplied: string[];
}

/**
 * Migrates a legacy or unversioned journey to the current schema version.
 */
export function migrateJourneySchema(rawJourney: Record<string, any>): MigrationResult {
  const changes: string[] = [];
  const fromVersion = rawJourney.schemaVersion || 'legacy';

  const migrated: any = { ...rawJourney };

  // 1. Ensure schemaVersion is current
  if (migrated.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    changes.push(`Updated schemaVersion from "${fromVersion}" to "${CURRENT_SCHEMA_VERSION}".`);
    migrated.schemaVersion = CURRENT_SCHEMA_VERSION;
  }

  // 1b. Ensure projectId and ownerId
  if (!migrated.projectId) {
    migrated.projectId = 'proj_default';
    changes.push('Assigned default projectId.');
  }
  if (!migrated.ownerId) {
    migrated.ownerId = 'usr_default';
    changes.push('Assigned default ownerId.');
  }

  // 2. Ensure config defaults exist
  if (!migrated.config || typeof migrated.config !== 'object') {
    changes.push('Initialized default journey config object.');
    migrated.config = {
      defaultTimeoutMs: 10000,
      stopOnFailure: true,
      allowedHosts: ['localhost', '127.0.0.1'],
    };
  }

  // 3. Ensure sequential step IDs and orders
  if (Array.isArray(migrated.steps)) {
    migrated.steps = migrated.steps.map((step: any, idx: number) => {
      const stepIndex = idx + 1;
      let stepChanged = false;
      const patched = { ...step };

      if (!patched.id) {
        patched.id = `stp_migrated_${stepIndex}`;
        stepChanged = true;
      }
      if (patched.order !== stepIndex) {
        patched.order = stepIndex;
        stepChanged = true;
      }

      if (stepChanged) {
        changes.push(`Normalized Step #${stepIndex} ID and sequential order.`);
      }
      return patched;
    });
  } else {
    migrated.steps = [];
    changes.push('Initialized empty steps array.');
  }

  const validated = assertValidJourney(migrated);

  return {
    migrated: changes.length > 0,
    fromVersion,
    toVersion: CURRENT_SCHEMA_VERSION,
    journey: validated,
    changesApplied: changes,
  };
}
