/**
 * Pluggable Database & Persistence Engine Factory
 *
 * Bootstraps the active persistence engine (Native SQLite WAL, Native PostgreSQL,
 * or In-Memory Fixture), auto-executing idempotent schema migrations on startup.
 */

import type { IPhysicalDatabaseDriver, DatabaseDialect } from '../types/pluggable-database.ts';
import { NativeSqliteDriver } from './native-sqlite-driver.ts';
import { NativePostgresDriver } from './native-postgres-driver.ts';
import { MigrationOrchestrator } from './migration-orchestrator.ts';
import { PluggableProjectRepository } from '../repositories/project-repository.ts';
import { PluggableRunRepository } from '../repositories/run-repository.ts';
import { PluggableArtifactJourneyRepository } from '../repositories/artifact-journey-repository.ts';
import { PluggableSettingsRepository } from '../repositories/settings-notification-repository.ts';

export class PluggableDatabaseFactory {
  private static instance: PluggableDatabaseFactory | null = null;
  private driver: IPhysicalDatabaseDriver;
  private initialized: boolean = false;
  private initPromise: Promise<void> | null = null;

  public projectRepo!: PluggableProjectRepository;
  public runRepo!: PluggableRunRepository;
  public artifactJourneyRepo!: PluggableArtifactJourneyRepository;
  public settingsRepo!: PluggableSettingsRepository;

  private constructor(dialect?: DatabaseDialect) {
    const activeDialect = dialect || (process.env.PROOFIX_DB_DIALECT as DatabaseDialect) || 'sqlite';

    if (activeDialect === 'postgres') {
      this.driver = new NativePostgresDriver({
        connectionUrl: process.env.DATABASE_URL,
      });
    } else {
      // Default: Native SQLite with WAL mode enabled
      const dbPath = process.env.SQLITE_DB_PATH || './data/proofix.db';
      this.driver = NativeSqliteDriver.createFileDriver(dbPath);
    }

    this.bindRepositories();
  }

  public static getInstance(dialect?: DatabaseDialect): PluggableDatabaseFactory {
    if (!this.instance) {
      this.instance = new PluggableDatabaseFactory(dialect);
    }
    return this.instance;
  }

  public static resetInstance(): void {
    if (this.instance) {
      this.instance.driver.disconnect();
      this.instance = null;
    }
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      await this.driver.connect();

      // Automatically execute pending migrations on startup with checksum validation
      if (process.env.PROOFIX_SKIP_MIGRATIONS !== 'true') {
        const orchestrator = new MigrationOrchestrator(this.driver);
        await orchestrator.up();
      }

      this.initialized = true;
    })();

    return this.initPromise;
  }

  public getDriver(): IPhysicalDatabaseDriver {
    return this.driver;
  }

  public setDriver(customDriver: IPhysicalDatabaseDriver): void {
    this.driver = customDriver;
    this.initialized = false;
    this.initPromise = null;
    this.bindRepositories();
  }

  private bindRepositories(): void {
    this.projectRepo = new PluggableProjectRepository(this.driver);
    this.runRepo = new PluggableRunRepository(this.driver);
    this.artifactJourneyRepo = new PluggableArtifactJourneyRepository(this.driver);
    this.settingsRepo = new PluggableSettingsRepository(this.driver);
  }
}

export const globalDatabaseFactory = PluggableDatabaseFactory.getInstance();
