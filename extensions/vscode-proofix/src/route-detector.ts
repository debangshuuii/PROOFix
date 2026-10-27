import path from 'path';
import { RouteHandlerInfo } from './types';

/**
 * Checks if a file path corresponds to a Next.js App Router or Pages Router endpoint.
 */
export function isRouteFile(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  
  // App Router routes
  if (/(?:^|\/)(?:src\/)?app\/(?:.*\/)?(?:page|route|layout)\.(?:tsx|ts|jsx|js)$/.test(normalized)) {
    return true;
  }

  // Pages Router routes
  if (/(?:^|\/)(?:src\/)?pages\/(?:.*)\.(?:tsx|ts|jsx|js)$/.test(normalized)) {
    // Exclude special Next.js files
    if (/_app|_document|_error/.test(normalized)) return false;
    return true;
  }

  return false;
}

/**
 * Normalizes a filesystem path into an HTTP route path.
 */
export function normalizeRouteFromPath(filePath: string): string {
  let normalized = filePath.replace(/\\/g, '/');

  // Strip prefix up to app/ or pages/
  const appIdx = normalized.indexOf('/app/');
  const pagesIdx = normalized.indexOf('/pages/');

  if (appIdx !== -1) {
    let sub = normalized.substring(appIdx + 5);
    // Strip trailing filename
    sub = sub.replace(/\/(?:page|route|layout)\.(?:tsx|ts|jsx|js)$/, '');
    sub = sub.replace(/^(?:page|route|layout)\.(?:tsx|ts|jsx|js)$/, '');
    // Strip route groups e.g. (auth), (dashboard)
    sub = sub.replace(/\/\([^)]+\)/g, '').replace(/^\([^)]+\)\/?/, '');
    return sub === '' ? '/' : `/${sub}`;
  }

  if (pagesIdx !== -1) {
    let sub = normalized.substring(pagesIdx + 7);
    sub = sub.replace(/\.(?:tsx|ts|jsx|js)$/, '');
    if (sub.endsWith('/index') || sub === 'index') {
      sub = sub.replace(/\/?index$/, '');
    }
    return sub === '' ? '/' : `/${sub}`;
  }

  return '/';
}

/**
 * Scans file contents to locate the line number of the main route handler export.
 */
export function findRouteExportLine(fileContent: string): { line: number; exportName: string } {
  const lines = fileContent.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // default export (page components)
    if (/export\s+default\s+(?:function|const|class)/.test(line)) {
      const match = line.match(/export\s+default\s+(?:function|class)?\s*([a-zA-Z0-9_]+)?/);
      return { line: i, exportName: match && match[1] ? match[1] : 'default' };
    }

    // named HTTP handler exports (GET, POST, PUT, DELETE, PATCH)
    if (/export\s+(?:async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH)\b/.test(line)) {
      const match = line.match(/\b(GET|POST|PUT|DELETE|PATCH)\b/);
      return { line: i, exportName: match ? match[1] : 'GET' };
    }
  }

  return { line: 0, exportName: 'default' };
}
