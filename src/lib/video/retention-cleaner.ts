import fs from 'fs';
import path from 'path';
import type { RetentionCleanupResult } from '../types/video.ts';

export interface RetentionCleanupOptions {
  baseArtifactsDir?: string;
  maxAgeDays?: number;
  maxTotalStorageMb?: number;
  activeRunIds?: string[];
  dbProvider?: {
    getRuns: () => Promise<{ id: string; status: string }[]>;
  };
}

interface VideoFileEntry {
  filePath: string;
  runId: string;
  sizeBytes: number;
  mtimeMs: number;
}

/**
 * Enforces configurable retention periods and size limits on video recording artifacts,
 * with strict safety guards that respect active execution runs.
 * "Done when: expired artifacts are cleaned up safely and cleanup failures are observable."
 */
export async function enforceVideoRetention(
  options: RetentionCleanupOptions = {}
): Promise<RetentionCleanupResult> {
  const maxAgeDays = options.maxAgeDays !== undefined ? options.maxAgeDays : 14;
  const maxTotalStorageBytes = (options.maxTotalStorageMb !== undefined ? options.maxTotalStorageMb : 500) * 1024 * 1024;
  const rootArtifactsDir = options.baseArtifactsDir || path.join(process.cwd(), 'public', 'artifacts');
  const runsDir = path.join(rootArtifactsDir, 'runs');

  const result: RetentionCleanupResult = {
    checkedCount: 0,
    deletedCount: 0,
    bytesReclaimed: 0,
    activeRunsPreserved: [],
    errors: [],
  };

  // 1. Identify active run IDs that must NEVER be touched
  const activeStatuses = new Set([
    'pending',
    'importing',
    'analyzing',
    'preparing',
    'installing',
    'building',
    'starting',
    'testing',
    'analyzing_ai',
  ]);

  const activeRunIdSet = new Set<string>(options.activeRunIds || []);

  if (options.dbProvider) {
    try {
      const runs = await options.dbProvider.getRuns();
      for (const r of runs) {
        if (activeStatuses.has(r.status)) {
          activeRunIdSet.add(r.id);
        }
      }
    } catch (dbErr: any) {
      result.errors.push(`Failed querying active runs from db: ${dbErr.message}`);
    }
  }

  result.activeRunsPreserved = Array.from(activeRunIdSet);

  if (!fs.existsSync(runsDir)) {
    return result;
  }

  // 2. Scan for video files across all runs
  const entries: VideoFileEntry[] = [];
  const now = Date.now();
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;

  try {
    const runFolders = fs.readdirSync(runsDir);
    for (const runFolder of runFolders) {
      const videoFolder = path.join(runsDir, runFolder, 'videos');
      if (fs.existsSync(videoFolder) && fs.statSync(videoFolder).isDirectory()) {
        try {
          const files = fs.readdirSync(videoFolder);
          for (const file of files) {
            if (file.endsWith('.webm')) {
              const filePath = path.join(videoFolder, file);
              try {
                const stat = fs.statSync(filePath);
                if (stat.isFile()) {
                  entries.push({
                    filePath,
                    runId: runFolder,
                    sizeBytes: stat.size,
                    mtimeMs: stat.mtimeMs,
                  });
                }
              } catch (statErr: any) {
                result.errors.push(`Stat error on file ${filePath}: ${statErr.message}`);
              }
            }
          }
        } catch (dirErr: any) {
          result.errors.push(`Read error on directory ${videoFolder}: ${dirErr.message}`);
        }
      }
    }
  } catch (scanErr: any) {
    result.errors.push(`Error scanning runs directory: ${scanErr.message}`);
    return result;
  }

  result.checkedCount = entries.length;

  // 3. Phase 1: Clean up expired files (age > maxAgeDays), skipping active runs
  const remaining: VideoFileEntry[] = [];

  for (const entry of entries) {
    // If belongs to active run, strictly preserve!
    if (activeRunIdSet.has(entry.runId)) {
      remaining.push(entry);
      continue;
    }

    const ageMs = now - entry.mtimeMs;
    if (ageMs > maxAgeMs) {
      // Expired! Delete safely
      try {
        fs.unlinkSync(entry.filePath);
        result.deletedCount++;
        result.bytesReclaimed += entry.sizeBytes;
      } catch (delErr: any) {
        result.errors.push(`Failed deleting expired video ${entry.filePath}: ${delErr.message}`);
        remaining.push(entry);
      }
    } else {
      remaining.push(entry);
    }
  }

  // 4. Phase 2: Enforce total storage size limit (oldest files first, skipping active runs)
  let currentTotalBytes = remaining.reduce((sum, e) => sum + e.sizeBytes, 0);

  if (currentTotalBytes > maxTotalStorageBytes) {
    // Sort oldest files first
    remaining.sort((a, b) => a.mtimeMs - b.mtimeMs);

    for (const entry of remaining) {
      if (currentTotalBytes <= maxTotalStorageBytes) {
        break;
      }

      // Never delete videos belonging to active runs even to meet size quota!
      if (activeRunIdSet.has(entry.runId)) {
        continue;
      }

      try {
        fs.unlinkSync(entry.filePath);
        result.deletedCount++;
        result.bytesReclaimed += entry.sizeBytes;
        currentTotalBytes -= entry.sizeBytes;
      } catch (delErr: any) {
        result.errors.push(`Failed deleting video under size quota ${entry.filePath}: ${delErr.message}`);
      }
    }
  }

  return result;
}
