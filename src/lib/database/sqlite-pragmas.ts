/**
 * SQLite PRAGMA Optimization Suite
 *
 * Configures enterprise-grade SQLite pragmas:
 * - WAL journal mode for non-blocking concurrent readers/writers
 * - SYNCHRONOUS = NORMAL for high-throughput ACID compliance
 * - FOREIGN_KEYS = ON for relational integrity
 * - BUSY_TIMEOUT for non-crashing lock waits
 * - MMAP_SIZE & CACHE_SIZE for zero-copy in-memory performance
 */

import type { DatabaseSync } from 'node:sqlite';
import type { DatabaseEngineConfig } from '../types/pluggable-database.ts';

export function applySqlitePragmas(
  db: DatabaseSync,
  config: DatabaseEngineConfig,
  isMemory: boolean = false
): string[] {
  const applied: string[] = [];

  // 1. Journal Mode (WAL mode for disk, memory for in-memory)
  if (!isMemory && config.walMode !== false) {
    db.exec('PRAGMA journal_mode = WAL;');
    applied.push('PRAGMA journal_mode = WAL;');
  }

  // 2. Synchronous Mode
  const syncMode = config.synchronousMode || 'NORMAL';
  db.exec(`PRAGMA synchronous = ${syncMode};`);
  applied.push(`PRAGMA synchronous = ${syncMode};`);

  // 3. Foreign Keys
  if (config.enableForeignKeys !== false) {
    db.exec('PRAGMA foreign_keys = ON;');
    applied.push('PRAGMA foreign_keys = ON;');
  }

  // 4. Busy Timeout (default: 5000ms)
  const timeoutMs = config.busyTimeoutMs ?? 5000;
  db.exec(`PRAGMA busy_timeout = ${timeoutMs};`);
  applied.push(`PRAGMA busy_timeout = ${timeoutMs};`);

  // 5. In-Memory Temp Store
  db.exec('PRAGMA temp_store = MEMORY;');
  applied.push('PRAGMA temp_store = MEMORY;');

  // 6. Memory-Mapped I/O (256MB)
  if (!isMemory) {
    db.exec('PRAGMA mmap_size = 268435456;');
    applied.push('PRAGMA mmap_size = 268435456;');
  }

  // 7. Page Cache (64MB)
  db.exec('PRAGMA cache_size = -64000;');
  applied.push('PRAGMA cache_size = -64000;');

  return applied;
}
