/**
 * Markers and utilities for identifying and deduplicating sticky PR comments.
 */

export const STICKY_COMMENT_MARKER = '<!-- proofix-sticky-pr-comment -->';
export const STICKY_COMMENT_VERSION = 'v1.0';
export const STICKY_COMMENT_HEADER = `<!-- proofix-version:${STICKY_COMMENT_VERSION} -->`;

/**
 * Checks if an existing GitHub comment body was created by the PROOFix action.
 */
export function isProofixStickyComment(body: string): boolean {
  if (!body) return false;
  return (
    body.includes(STICKY_COMMENT_MARKER) ||
    body.includes('<!-- proofix-version:') ||
    body.includes('### 🛡️ PROOFix Verification Report')
  );
}

/**
 * Wraps comment body with standardized hidden deduplication markers.
 */
export function wrapWithStickyMarker(content: string, runId?: string): string {
  const runIdMarker = runId ? `<!-- proofix-run-id:${runId} -->` : '';
  return `${STICKY_COMMENT_MARKER}\n${STICKY_COMMENT_HEADER}\n${runIdMarker}\n${content.trim()}\n`;
}

/**
 * Extracts previous run ID from an existing sticky comment body if present.
 */
export function extractPreviousRunId(body: string): string | undefined {
  const match = body.match(/<!-- proofix-run-id:([a-zA-Z0-9_\-]+) -->/);
  return match ? match[1] : undefined;
}
