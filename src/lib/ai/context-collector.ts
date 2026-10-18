import fs from 'fs';
import path from 'path';
import type { TestResult } from '../types';
import { redactSensitiveData } from '../security/redactor';

export interface SourceSnippet {
  filePath: string;
  startLine: number;
  endLine: number;
  content: string;
}

export interface FailureContext {
  failureId: string;
  testName: string;
  category: string;
  errorMessage: string;
  stackTrace?: string;
  consoleErrors: { text: string; location?: string }[];
  networkFailures: { url: string; status: number; failureReason?: string }[];
  commitSha: string;
  relatedSnippets: SourceSnippet[];
  collectedAt: string;
}

/**
 * Collects complete, sanitized diagnostic context for a test failure.
 * Reads referenced source files and redacts all secrets/credentials.
 */
export async function collectFailureContext(params: {
  testResult: TestResult;
  commitSha: string;
  workspaceRoot?: string;
}): Promise<FailureContext> {
  const { testResult, commitSha, workspaceRoot = process.cwd() } = params;

  const rawMessage = testResult.actualResult || 'Unknown test failure';
  const cleanMessage = redactSensitiveData(rawMessage);

  // Extract console errors
  const consoleErrors = (testResult.evidence?.consoleErrors || []).map((err) => ({
    text: redactSensitiveData(err.text),
    location: err.location ? redactSensitiveData(err.location) : undefined,
  }));

  // Extract network failures
  const networkFailures = (testResult.evidence?.networkFailures || []).map((net) => ({
    url: redactSensitiveData(net.url),
    status: typeof net.status === 'number' ? net.status : 0,
    failureReason: net.failureReason ? redactSensitiveData(net.failureReason) : undefined,
  }));

  // Parse candidate file paths from error text, console errors, or test step failures
  const candidateFiles = new Set<string>();

  // Extract file paths matching common extensions (src/... or app/...)
  const filePathRegex = /(?:src|app|pages|components|lib)[\/\\][a-zA-Z0-9_\-\.\/\\]+\.(?:tsx|ts|jsx|js|css|json)/gi;
  const combinedErrorText = [
    cleanMessage,
    ...consoleErrors.map((c) => `${c.text} ${c.location || ''}`),
    ...(testResult.evidence?.steps || []).map((s) => `${s.name} ${s.error || ''}`),
  ].join('\n');

  let match: RegExpExecArray | null;
  while ((match = filePathRegex.exec(combinedErrorText)) !== null) {
    candidateFiles.add(match[0].replace(/\\/g, '/'));
  }

  // Fallback defaults based on route if no explicit path was found
  if (candidateFiles.size === 0) {
    if (testResult.name.toLowerCase().includes('navigation') || cleanMessage.includes('/broken-route')) {
      candidateFiles.add('src/fixtures/sample-app/src/app/page.tsx');
    } else if (cleanMessage.includes('/api/data')) {
      candidateFiles.add('src/fixtures/sample-app/src/app/api/data/route.ts');
    }
  }

  const relatedSnippets: SourceSnippet[] = [];

  for (const relFile of candidateFiles) {
    const fullPath = path.resolve(workspaceRoot, relFile);

    // Security guard: Ensure target file stays within workspaceRoot
    if (!fullPath.startsWith(path.resolve(workspaceRoot))) {
      continue;
    }

    if (fs.existsSync(fullPath)) {
      try {
        const fileContent = fs.readFileSync(fullPath, 'utf-8');
        const lines = fileContent.split('\n');

        // Extract top 30 lines or whole file if short
        const maxLines = Math.min(lines.length, 35);
        const snippetLines = lines.slice(0, maxLines).map((l) => redactSensitiveData(l));

        relatedSnippets.push({
          filePath: relFile,
          startLine: 1,
          endLine: maxLines,
          content: snippetLines.join('\n'),
        });
      } catch (err) {
        console.warn(`Could not read source file for failure context: ${relFile}`, err);
      }
    }
  }

  return {
    failureId: testResult.id,
    testName: testResult.name,
    category: testResult.category,
    errorMessage: cleanMessage,
    stackTrace: testResult.actualResult.includes('at ') ? cleanMessage : undefined,
    consoleErrors,
    networkFailures,
    commitSha,
    relatedSnippets,
    collectedAt: new Date().toISOString(),
  };
}
