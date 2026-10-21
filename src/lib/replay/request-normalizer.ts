/**
 * Request Normalizer, Canonical Hasher & Secret Scrubber (Contribution 142)
 */

import crypto from 'crypto';
import type {
  RecordedRequest,
  RecordedResponse,
} from '../types/mock-replay.ts';

// Headers that fluctuate across requests and should NOT influence cassette matching
export const VOLATILE_HEADERS = new Set([
  'date',
  'user-agent',
  'host',
  'connection',
  'content-length',
  'if-none-match',
  'if-modified-since',
  'traceparent',
  'tracestate',
  'x-request-id',
  'x-forwarded-for',
  'x-forwarded-host',
  'x-forwarded-proto',
  'sec-ch-ua',
  'sec-ch-ua-mobile',
  'sec-ch-ua-platform',
  'sec-fetch-site',
  'sec-fetch-mode',
  'sec-fetch-dest',
]);

// Secret regex patterns to scrub from recorded traffic
export const SECRET_PATTERNS: { regex: RegExp; replacement: string }[] = [
  // Stripe API keys
  { regex: /sk_(live|test|mock)_[0-9a-zA-Z_]{10,99}/g, replacement: 'sk_$1_[SCRUBBED_STRIPE_KEY]' },
  // GitHub Personal Access Tokens
  { regex: /gh[pousr]_[A-Za-z0-9_]{36,255}/g, replacement: 'ghp_[SCRUBBED_GITHUB_TOKEN]' },
  // Google / Gemini API Keys
  { regex: /AIza[0-9A-Za-z-_]{35}/g, replacement: 'AIza[SCRUBBED_GOOGLE_KEY]' },
  // AWS Access Keys
  { regex: /(?:AKIA|ABIA|ACCA|ASIA)[0-9A-Z]{16}/g, replacement: 'AKIA[SCRUBBED_AWS_KEY]' },
  // Bearer tokens
  { regex: /Bearer\s+[A-Za-z0-9\-_.]+/gi, replacement: 'Bearer [SCRUBBED_BEARER_TOKEN]' },
  // Passwords in JSON / query
  { regex: /(["']?password["']?\s*[:=]\s*["'])([^"']+)(["'])/gi, replacement: '$1[SCRUBBED_PASSWORD]$3' },
  // Credit card numbers (13 to 19 digits with optional hyphens/spaces)
  { regex: /\b(?:\d{4}[ -]?){3}\d{4}\b/g, replacement: '4242-XXXX-XXXX-4242' },
  // CVV / CVC
  { regex: /(["']?(?:cvv|cvc)["']?\s*[:=]\s*["']?)(\d{3,4})(["']?)/gi, replacement: '$1[SCRUBBED_CVV]$3' },
];

/**
 * Scrubs credentials and sensitive tokens from a text string.
 */
export function scrubText(text: string): { text: string; scrubbedCount: number } {
  let result = text;
  let count = 0;

  for (const { regex, replacement } of SECRET_PATTERNS) {
    const matches = result.match(regex);
    if (matches) {
      count += matches.length;
      result = result.replace(regex, replacement);
    }
  }

  return { text: result, scrubbedCount: count };
}

/**
 * Normalizes an incoming HTTP request into a canonical RecordedRequest format.
 */
export function normalizeRequest(raw: {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
  timestamp?: string;
}): RecordedRequest {
  const method = raw.method.toUpperCase();
  const parsedUrl = new URL(raw.url);

  // Extract and sort query parameters
  const queryParams: Record<string, string> = {};
  const sortedKeys = Array.from(parsedUrl.searchParams.keys()).sort();
  for (const key of sortedKeys) {
    queryParams[key] = parsedUrl.searchParams.get(key) || '';
  }

  // Normalize and filter headers
  const headers: Record<string, string> = {};
  if (raw.headers) {
    const sortedHeaderKeys = Object.keys(raw.headers)
      .map((k) => k.toLowerCase())
      .filter((k) => !VOLATILE_HEADERS.has(k))
      .sort();

    for (const k of sortedHeaderKeys) {
      const originalKey = Object.keys(raw.headers).find((orig) => orig.toLowerCase() === k);
      if (originalKey) {
        headers[k] = raw.headers[originalKey];
      }
    }
  }

  // Normalize JSON body if valid JSON
  let normalizedBody = raw.body;
  if (normalizedBody) {
    try {
      const parsedBody = JSON.parse(normalizedBody);
      // Recursively sorted JSON keys for canonical representation
      normalizedBody = JSON.stringify(sortObjectKeys(parsedBody));
    } catch {
      // Keep raw body if not JSON
    }
  }

  const rec: RecordedRequest = {
    method,
    url: `${parsedUrl.origin}${parsedUrl.pathname}`,
    path: parsedUrl.pathname,
    queryParams,
    headers,
    body: normalizedBody,
    timestamp: raw.timestamp || new Date().toISOString(),
  };

  rec.bodyHash = computeCanonicalHash(rec);
  return rec;
}

/**
 * Recursively sorts object keys for canonical JSON serialization.
 */
export function sortObjectKeys(obj: any): any {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return Array.isArray(obj) ? obj.map(sortObjectKeys) : obj;
  }

  const sorted: Record<string, any> = {};
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = sortObjectKeys(obj[key]);
  }
  return sorted;
}

/**
 * Computes a deterministic SHA-256 canonical hash of the request.
 */
export function computeCanonicalHash(req: RecordedRequest): string {
  const queryTokens = Object.entries(req.queryParams)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('&');

  const headerTokens = Object.entries(req.headers)
    .filter(([k]) => ['authorization', 'content-type', 'accept'].includes(k))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join('|');

  const canonicalString = [
    req.method,
    req.path,
    queryTokens,
    headerTokens,
    req.body || '',
  ].join(':::');

  return crypto.createHash('sha256').update(canonicalString).digest('hex');
}

/**
 * Scrubs request and response data before persisting into a cassette.
 */
export function scrubRequestAndResponse(
  req: RecordedRequest,
  res: RecordedResponse
): { req: RecordedRequest; res: RecordedResponse; scrubbedCount: number } {
  let totalScrubbed = 0;

  // 1. Scrub Request Headers
  const scrubbedReqHeaders: Record<string, string> = {};
  for (const [k, v] of Object.entries(req.headers)) {
    const { text, scrubbedCount } = scrubText(v);
    totalScrubbed += scrubbedCount;
    scrubbedReqHeaders[k] = text;
  }

  // 2. Scrub Request Body
  let scrubbedReqBody = req.body;
  if (scrubbedReqBody) {
    const { text, scrubbedCount } = scrubText(scrubbedReqBody);
    totalScrubbed += scrubbedCount;
    scrubbedReqBody = text;
  }

  // 3. Scrub Response Body
  let scrubbedResBody = res.body;
  if (scrubbedResBody) {
    const { text, scrubbedCount } = scrubText(scrubbedResBody);
    totalScrubbed += scrubbedCount;
    scrubbedResBody = text;
  }

  const cleanReq: RecordedRequest = {
    ...req,
    headers: scrubbedReqHeaders,
    body: scrubbedReqBody,
  };

  const cleanRes: RecordedResponse = {
    ...res,
    body: scrubbedResBody,
  };

  return {
    req: cleanReq,
    res: cleanRes,
    scrubbedCount: totalScrubbed,
  };
}
