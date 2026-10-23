/**
 * SQLite Parameterized Query Translator & Statement Cache
 *
 * Converts PostgreSQL positional parameters ($1, $2, ...) to SQLite ?,
 * and maintains an LRU statement cache for maximum query execution speed.
 */

import type { DatabaseSync, StatementSync } from 'node:sqlite';

export function normalizeSqlToSqlite(sql: string): string {
  // Convert Postgres $1, $2, ... to ?
  return sql.replace(/\$(\d+)/g, '?').trim();
}

export class SqliteStatementCache {
  private db: DatabaseSync;
  private cache: Map<string, StatementSync> = new Map();
  private maxCacheSize: number;

  constructor(db: DatabaseSync, maxCacheSize: number = 200) {
    this.db = db;
    this.maxCacheSize = maxCacheSize;
  }

  public get(sql: string): StatementSync {
    const normalized = normalizeSqlToSqlite(sql);
    let stmt = this.cache.get(normalized);

    if (!stmt) {
      if (this.cache.size >= this.maxCacheSize) {
        // Evict oldest entry
        const firstKey = this.cache.keys().next().value;
        if (firstKey) {
          this.cache.delete(firstKey);
        }
      }

      stmt = this.db.prepare(normalized);
      this.cache.set(normalized, stmt);
    }

    return stmt;
  }

  public clear(): void {
    this.cache.clear();
  }

  public size(): number {
    return this.cache.size;
  }
}
