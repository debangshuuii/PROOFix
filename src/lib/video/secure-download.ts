import fs from 'fs';
import path from 'path';

export interface DownloadDbProvider {
  getProjectById: (id: string) => Promise<{ id: string; ownerId: string; [key: string]: any } | null>;
  getRunById: (id: string) => Promise<{ id: string; projectId: string; [key: string]: any } | null>;
}

export interface DownloadAccessParams {
  projectId: string;
  runId: string;
  videoIdOrName: string;
  requesterUserId?: string;
  baseArtifactsDir?: string;
  dbInstance?: DownloadDbProvider;
}

export interface DownloadAccessResult {
  authorized: boolean;
  statusCode: number;
  errorMessage?: string;
  diskPath?: string;
  fileName?: string;
  sizeBytes?: number;
  headers?: Record<string, string>;
}

/**
 * Validates download authorization, enforces ownership checks,
 * guards against path traversal, and prepares secure download headers.
 * "Done when: access checks prevent users from downloading recordings belonging to unauthorized projects."
 */
export async function validateDownloadAccess(
  params: DownloadAccessParams
): Promise<DownloadAccessResult> {
  const { projectId, runId, videoIdOrName, requesterUserId, baseArtifactsDir, dbInstance } = params;

  // 1. Path traversal guard
  if (!projectId || !runId || !videoIdOrName) {
    return {
      authorized: false,
      statusCode: 400,
      errorMessage: 'Missing required projectId, runId, or video identifier.',
    };
  }

  const traversalPattern = /(\.\.|\/|\\)/;
  if (traversalPattern.test(projectId) || traversalPattern.test(runId) || traversalPattern.test(videoIdOrName)) {
    return {
      authorized: false,
      statusCode: 400,
      errorMessage: 'Path traversal detected in project, run, or video identifier.',
    };
  }

  // Sanitize video identifier (allow alphanumeric, underscore, hyphen, and dot)
  const safeVideoName = path.basename(videoIdOrName);
  if (!/^[\w.-]+$/.test(safeVideoName)) {
    return {
      authorized: false,
      statusCode: 400,
      errorMessage: 'Invalid characters or path traversal in video identifier.',
    };
  }

  // 2. Resolve database provider
  const database = dbInstance || ((await import('../db/index.ts')) as any).db;

  // 3. Project existence and authorization
  const project = await database.getProjectById(projectId);
  if (!project) {
    return {
      authorized: false,
      statusCode: 404,
      errorMessage: `Project "${projectId}" not found.`,
    };
  }

  // Access check: If requesterUserId is specified, verify ownership
  if (requesterUserId && project.ownerId !== requesterUserId) {
    return {
      authorized: false,
      statusCode: 403,
      errorMessage: `Access denied: User "${requesterUserId}" is not authorized to download artifacts from project "${projectId}".`,
    };
  }

  // 4. Verification Run check
  const run = await database.getRunById(runId);
  if (!run) {
    return {
      authorized: false,
      statusCode: 404,
      errorMessage: `Verification run "${runId}" not found.`,
    };
  }

  if (run.projectId !== projectId) {
    return {
      authorized: false,
      statusCode: 403,
      errorMessage: `Mismatch: Run "${runId}" does not belong to project "${projectId}".`,
    };
  }

  // 5. File existence and confinement check
  const rootDir = baseArtifactsDir || path.join(process.cwd(), 'public', 'artifacts');
  const videosDir = path.join(rootDir, 'runs', runId, 'videos');

  // Find candidate file: either direct filename or matches prefix / videoId
  let targetPath = path.join(videosDir, safeVideoName);
  if (!safeVideoName.endsWith('.webm')) {
    targetPath += '.webm';
  }

  if (!fs.existsSync(targetPath)) {
    // Check if videoIdOrName is an artifact ID
    if (fs.existsSync(videosDir)) {
      const candidates = fs.readdirSync(videosDir);
      const match = candidates.find(
        (c) => c.includes(safeVideoName) || c.startsWith(safeVideoName)
      );
      if (match) {
        targetPath = path.join(videosDir, match);
      }
    }
  }

  // Ensure resolved path is strictly within the videosDir
  const relative = path.relative(videosDir, targetPath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return {
      authorized: false,
      statusCode: 403,
      errorMessage: 'Access denied: File resolves outside authorized run videos directory.',
    };
  }

  if (!fs.existsSync(targetPath)) {
    return {
      authorized: false,
      statusCode: 404,
      errorMessage: 'Video recording file does not exist or has been cleaned up by retention policy.',
    };
  }

  const stats = fs.statSync(targetPath);
  const outFileName = `proofix-${runId}-${path.basename(targetPath)}`;

  return {
    authorized: true,
    statusCode: 200,
    diskPath: targetPath,
    fileName: outFileName,
    sizeBytes: stats.size,
    headers: {
      'Content-Type': 'video/webm',
      'Content-Disposition': `attachment; filename="${outFileName}"`,
      'Content-Length': stats.size.toString(),
      'Cache-Control': 'private, no-transform, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    },
  };
}
