/**
 * Migration Checksum & Manifest Validator
 *
 * Implements deterministic SHA-256 checksum calculation with
 * normalized whitespace, migration discovery, and version sequence verification.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { MigrationScript } from '../types/migration-manifest.ts';

export function computeMigrationChecksum(sql: string): string {
  // Normalize Windows/Unix line breaks and trailing spaces for cross-platform consistency
  const normalized = sql
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();

  return crypto.createHash('sha256').update(normalized, 'utf8').digest('hex');
}

export function parseMigrationFileName(fileName: string): { version: number; name: string } {
  const match = fileName.match(/^(\d+)_(.+)\.sql$/);
  if (!match) {
    throw new Error(
      `Invalid migration filename format: "${fileName}". Expected format: "<version>_<name>.sql" (e.g. "001_initial.sql")`
    );
  }
  return {
    version: parseInt(match[1], 10),
    name: match[2],
  };
}

export function loadMigrationFile(filePath: string): MigrationScript {
  const fileName = path.basename(filePath);
  const { version, name } = parseMigrationFileName(fileName);
  const content = fs.readFileSync(filePath, 'utf8');

  // Split into UP and optional DOWN sections if specified by marker
  const parts = content.split(/--\s*Down Migration/i);
  const upSql = parts[0].trim();
  const downSql = parts.length > 1 ? parts[1].trim() : undefined;

  const checksumSha256 = computeMigrationChecksum(content);

  return {
    version,
    name,
    fileName,
    checksumSha256,
    upSql,
    downSql,
  };
}

export function loadAllMigrations(migrationsDir?: string): MigrationScript[] {
  const dir = migrationsDir || path.join(process.cwd(), 'data', 'migrations');
  if (!fs.existsSync(dir)) {
    return [];
  }

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const scripts = files.map((file) => loadMigrationFile(path.join(dir, file)));
  validateMigrationSequence(scripts);
  return scripts;
}

export function validateMigrationSequence(scripts: MigrationScript[]): void {
  const seenVersions = new Set<number>();
  for (let i = 0; i < scripts.length; i++) {
    const s = scripts[i];
    if (seenVersions.has(s.version)) {
      throw new Error(`Duplicate migration version detected: Version ${s.version} in file "${s.fileName}".`);
    }
    seenVersions.add(s.version);
  }
}
