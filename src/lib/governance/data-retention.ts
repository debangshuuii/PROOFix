/**
 * Sensitive Data Redaction & Data Retention Lifecycles (Contribution 176)
 *
 * Implements PII masking (credit cards, SSNs, bearer tokens, emails)
 * and automated TTL data retention lifecycle purges for GDPR/SOC2 compliance.
 */

import type { RetentionPolicy } from '../types/governance-compliance.ts';

export const PII_PATTERNS = {
  // Visa, MasterCard, Amex, Discover
  creditCard: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,
  // US SSN
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  // Email address
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  // Phone numbers (US/Intl)
  phone: /\b(?:\+?1[-. ]?)?\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})\b/g,
  // Bearer tokens and JWTs
  bearerToken: /Bearer\s+([A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+\.?[A-Za-z0-9\-_=]*)/gi,
  // Generic Authorization Header tokens
  authHeader: /(?:Authorization|Token|api[-_]?key):\s*['"]?([A-Za-z0-9_\-]{20,})['"]?/gi,
};

export interface ExpirableRecord {
  id: string;
  createdAt: string;
  type: 'test_run' | 'session_video' | 'audit_log';
}

export class DataRetentionManager {
  /**
   * Redacts sensitive PII from text, logs, or error stack traces.
   */
  public redactPii(content: string): string {
    let result = content;

    // Redact Credit Cards
    result = result.replace(PII_PATTERNS.creditCard, '[REDACTED_CREDIT_CARD]');

    // Redact SSN
    result = result.replace(PII_PATTERNS.ssn, '[REDACTED_SSN]');

    // Redact Bearer Tokens
    result = result.replace(PII_PATTERNS.bearerToken, 'Bearer [REDACTED_JWT]');

    // Redact Auth headers
    result = result.replace(PII_PATTERNS.authHeader, 'api_key: [REDACTED_KEY]');

    // Redact Email
    result = result.replace(PII_PATTERNS.email, '[REDACTED_EMAIL]');

    // Redact Phone
    result = result.replace(PII_PATTERNS.phone, '[REDACTED_PHONE]');

    return result;
  }

  /**
   * Recursively redacts PII within JSON objects.
   */
  public redactObject<T>(obj: T): T {
    if (typeof obj === 'string') {
      return this.redactPii(obj) as unknown as T;
    }
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map((item) => this.redactObject(item)) as unknown as T;
    }

    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const lower = key.toLowerCase();
      if (lower.includes('password') || lower.includes('secret') || lower.includes('token')) {
        out[key] = '[REDACTED_SECRET]';
      } else {
        out[key] = this.redactObject(value);
      }
    }
    return out as unknown as T;
  }

  /**
   * Determines if a record is expired under the tenant's retention policy.
   */
  public isRecordExpired(record: ExpirableRecord, policy: RetentionPolicy, nowMs: number = Date.now()): boolean {
    const ageMs = nowMs - new Date(record.createdAt).getTime();
    const dayMs = 24 * 60 * 60 * 1000;

    switch (record.type) {
      case 'session_video':
        return ageMs > policy.sessionVideoTtlDays * dayMs;
      case 'test_run':
        return ageMs > policy.testRunTtlDays * dayMs;
      case 'audit_log':
        return ageMs > policy.auditLogTtlDays * dayMs;
      default:
        return false;
    }
  }

  /**
   * Purges expired records and returns filtered active records.
   */
  public purgeExpiredRecords(
    records: ExpirableRecord[],
    policy: RetentionPolicy,
    nowMs: number = Date.now()
  ): { retained: ExpirableRecord[]; purgedCount: number } {
    const retained: ExpirableRecord[] = [];
    let purgedCount = 0;

    for (const rec of records) {
      if (this.isRecordExpired(rec, policy, nowMs)) {
        purgedCount++;
      } else {
        retained.push(rec);
      }
    }

    return { retained, purgedCount };
  }
}
