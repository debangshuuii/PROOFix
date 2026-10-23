/**
 * Native SQLite Connection Manager with WAL Mode
 *
 * Utilizes Node.js native DatabaseSync to provide zero-dependency,
 * high-performance embedded SQLite database connection management.
 */

import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { DatabaseEngineConfig } from '../types/pluggable-database.ts';

export class SqliteConnectionManager {
  private db: DatabaseSync | null = null;
  private readonly config: DatabaseEngineConfig;
  private isMemory: boolean = false;
  private resolvedPath: string = '';

  constructor(config?: Partial<DatabaseEngineConfig>) {
    this.config = {
      dialect: 'sqlite',
      connectionUrl: config?.connectionUrl || 'file:./data/proofix.db',
      walMode: config?.walMode ?? true,
      busyTimeoutMs: config?.busyTimeoutMs ?? 5000,
      synchronousMode: config?.synchronousMode ?? 'NORMAL',
      enableForeignKeys: config?.enableForeignKeys ?? true,
      ...config,
    };
  }

  public open(): DatabaseSync {
    if (this.db) {
      return this.db;
    }

    const url = this.config.connectionUrl || 'file:./data/proofix.db';
    if (url === ':memory:' || url === 'file::memory:' || url.includes(':memory:')) {
      this.isMemory = true;
      this.resolvedPath = ':memory:';
      this.db = new DatabaseSync(':memory:');
    } else {
      const cleanPath = url.replace(/^file:/, '');
      this.resolvedPath = path.isAbsolute(cleanPath)
        ? cleanPath
        : path.join(process.cwd(), cleanPath);

      const parentDir = path.dirname(this.resolvedPath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }

      this.db = new DatabaseSync(this.resolvedPath);
    }

    return this.db;
  }

  public getDatabase(): DatabaseSync {
    if (!this.db) {
      return this.open();
    }
    return this.db;
  }

  public close(): void {
    if (this.db) {
      try {
        this.db.close();
      } finally {
        this.db = null;
      }
    }
  }

  public isConnected(): boolean {
    return this.db !== null;
  }

  public getResolvedPath(): string {
    return this.resolvedPath;
  }

  public getConfig(): DatabaseEngineConfig {
    return { ...this.config };
  }
}
