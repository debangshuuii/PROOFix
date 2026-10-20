import fs from 'fs';
import path from 'path';
import type { TestResult } from '../types/index.ts';
import { sanitizeLogOutput } from '../security/secret-redaction.ts';
import { isPathEligibleForRepair } from './self-healing-policy.ts';

export interface SuspectFileContext {
  relativePath: string;
  absolutePath: string;
  content: string;
  targetLine?: number;
  snippet?: string;
}

export interface FailureRepairContext {
  failureId: string;
  testName: string;
  category: string;
  errorMessage: string;
  sanitizedStackTrace: string;
  consoleErrors: string[];
  networkErrors: string[];
  suspectFiles: SuspectFileContext[];
  evidenceSummary: string;
  synthesizedAt: string;
}

/**
 * Extracts stack trace file paths that reside inside the target project workspace.
 */
export function extractWorkspacePathsFromStackTrace(
  stack: string = '',
  workspaceRoot: string
): Array<{ filePath: string; line: number; column: number }> {
  const results: Array<{ filePath: string; line: number; column: number }> = [];
  const normalizedRoot = path.resolve(workspaceRoot).replace(/\\/g, '/');

  // Match: at ... (/path/to/project/src/file.ts:42:15) or at /path/to/project/src/file.ts:42:15
  const regex = /(?:at\s+(?:.*?\s+\()?)?([A-Za-z]:[\\\/][^:\s]+|\/[^:\s]+):(\d+):(\d+)\)?/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(stack)) !== null) {
    const rawPath = match[1].replace(/\\/g, '/');
    const line = parseInt(match[2], 10);
    const col = parseInt(match[3], 10);

    // Exclude node_modules, internal next/dist, and files outside workspace root
    if (
      rawPath.includes('/node_modules/') ||
      rawPath.includes('.next/') ||
      !rawPath.startsWith(normalizedRoot)
    ) {
      continue;
    }

    const relPath = path.relative(normalizedRoot, rawPath).replace(/\\/g, '/');
    if (!results.some((r) => r.filePath === relPath)) {
      results.push({ filePath: relPath, line, column: col });
    }
  }

  return results;
}

/**
 * Extracts a multi-line context snippet around a target line.
 */
export function extractCodeSnippet(
  content: string,
  targetLine: number = 1,
  radius: number = 4
): string {
  const lines = content.split('\n');
  const start = Math.max(0, targetLine - radius - 1);
  const end = Math.min(lines.length, targetLine + radius);

  return lines
    .slice(start, end)
    .map((line, idx) => {
      const currentLineNum = start + idx + 1;
      const marker = currentLineNum === targetLine ? ' > ' : '   ';
      return `${marker}${currentLineNum.toString().padStart(4, ' ')} | ${line}`;
    })
    .join('\n');
}

/**
 * Inactive or missing route path mapper for Next.js App / Pages routers.
 */
export function inferCandidateRouteFiles(
  routeUrl: string,
  workspaceRoot: string
): string[] {
  const candidates: string[] = [];
  const cleanRoute = routeUrl.replace(/^https?:\/\/[^\/]+/, '').split('?')[0].replace(/^\/+|\/+$/g, '');

  if (!cleanRoute) {
    candidates.push('src/app/page.tsx', 'src/app/page.jsx', 'pages/index.tsx', 'pages/index.jsx');
    return candidates;
  }

  if (cleanRoute.startsWith('api/')) {
    const apiSub = cleanRoute.slice(4);
    candidates.push(
      `src/app/api/${apiSub}/route.ts`,
      `src/app/api/${apiSub}/route.js`,
      `pages/api/${apiSub}.ts`,
      `pages/api/${apiSub}.js`
    );
  } else {
    candidates.push(
      `src/app/${cleanRoute}/page.tsx`,
      `src/app/${cleanRoute}/page.jsx`,
      `pages/${cleanRoute}.tsx`,
      `pages/${cleanRoute}.jsx`
    );
  }

  // Filter to files that actually exist in the workspace if available
  const existing = candidates.filter((rel) => fs.existsSync(path.join(workspaceRoot, rel)));
  return existing.length > 0 ? existing : candidates.slice(0, 2);
}

/**
 * Synthesizes complete failure repair context from test results and workspace files.
 */
export function synthesizeFailureContext(
  testResult: TestResult,
  workspaceRoot: string
): FailureRepairContext {
  const errorMsg = testResult.errorDetails?.message || testResult.actualResult || 'Unknown verification failure';
  const rawStack = testResult.errorDetails?.stack || '';

  // Redact any leaked secrets from logs & stack traces
  const sanitizedError = sanitizeLogOutput(errorMsg);
  const sanitizedStack = sanitizeLogOutput(rawStack);

  const consoleErrors = (testResult.evidence?.consoleErrors || []).map((c) =>
    sanitizeLogOutput(`[${c.type.toUpperCase()}] ${c.text}`)
  );

  const networkErrors = (testResult.evidence?.networkFailures || []).map((n) =>
    sanitizeLogOutput(`[HTTP ${n.status || 'FAILED'}] ${n.method} ${n.url} (${n.failureReason || 'Failed'})`)
  );

  const suspectFiles: SuspectFileContext[] = [];

  // 1. Try extracting from stack trace
  const stackMatches = extractWorkspacePathsFromStackTrace(rawStack, workspaceRoot);
  for (const m of stackMatches) {
    const absPath = path.join(workspaceRoot, m.filePath);
    if (fs.existsSync(absPath)) {
      const eligibility = isPathEligibleForRepair(m.filePath);
      if (eligibility.eligible) {
        try {
          const content = fs.readFileSync(absPath, 'utf8');
          suspectFiles.push({
            relativePath: m.filePath,
            absolutePath: absPath,
            content,
            targetLine: m.line,
            snippet: extractCodeSnippet(content, m.line),
          });
        } catch {
          // Ignore read error
        }
      }
    }
  }

  // 2. If no stack trace files found (e.g. 404 or route navigation error), infer candidate route files
  if (suspectFiles.length === 0 && testResult.errorDetails?.url) {
    const candidates = inferCandidateRouteFiles(testResult.errorDetails.url, workspaceRoot);
    for (const rel of candidates) {
      const absPath = path.join(workspaceRoot, rel);
      if (fs.existsSync(absPath)) {
        try {
          const content = fs.readFileSync(absPath, 'utf8');
          suspectFiles.push({
            relativePath: rel,
            absolutePath: absPath,
            content,
            snippet: extractCodeSnippet(content, 1),
          });
        } catch {
          // Ignore
        }
      }
    }
  }

  // 3. Fallback: inspect default entry page if still empty
  if (suspectFiles.length === 0) {
    const defaultPage = 'src/app/page.tsx';
    const absDefault = path.join(workspaceRoot, defaultPage);
    if (fs.existsSync(absDefault)) {
      try {
        const content = fs.readFileSync(absDefault, 'utf8');
        suspectFiles.push({
          relativePath: defaultPage,
          absolutePath: absDefault,
          content,
          snippet: extractCodeSnippet(content, 1),
        });
      } catch {
        // Ignore
      }
    }
  }

  return {
    failureId: testResult.id,
    testName: testResult.name,
    category: testResult.category,
    errorMessage: sanitizedError,
    sanitizedStackTrace: sanitizedStack,
    consoleErrors,
    networkErrors,
    suspectFiles,
    evidenceSummary: `Test "${testResult.name}" failed: ${sanitizedError}`,
    synthesizedAt: new Date().toISOString(),
  };
}
