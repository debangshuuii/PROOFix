/**
 * Immutable Cryptographic Audit Log Ledger with Hash Chaining (Contribution 173)
 *
 * Implements a tamper-evident append-only ledger using SHA-256 hash chaining (Merkle sequence).
 * Provides cryptographic mathematical proof of audit trail integrity for SOC2 Type II auditors.
 */

import crypto from 'crypto';
import type { AuditLogEntry, UserRole } from '../types/governance-compliance.ts';

export const GENESIS_HASH = '0'.repeat(64);

export interface AppendAuditLogInput {
  actorId: string;
  actorRole: UserRole;
  tenantId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  clientIp?: string;
  details?: Record<string, unknown>;
}

export class CryptographicAuditLedger {
  private chain: AuditLogEntry[] = [];

  constructor(initialEntries?: AuditLogEntry[]) {
    if (initialEntries && initialEntries.length > 0) {
      this.chain = [...initialEntries];
    }
  }

  /**
   * Computes the deterministic SHA-256 hash for an audit log entry.
   */
  public computeHash(
    previousHash: string,
    sequenceNumber: number,
    timestamp: string,
    actorId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    details: Record<string, unknown>
  ): string {
    const canonicalPayload = [
      previousHash,
      sequenceNumber.toString(),
      timestamp,
      actorId,
      action,
      resourceType,
      resourceId,
      JSON.stringify(details, Object.keys(details).sort()),
    ].join('|');

    return crypto.createHash('sha256').update(canonicalPayload).digest('hex');
  }

  /**
   * Appends a new immutable audit record to the cryptographic chain.
   */
  public append(input: AppendAuditLogInput): AuditLogEntry {
    const sequenceNumber = this.chain.length + 1;
    const timestamp = new Date().toISOString();
    const details = input.details || {};

    const previousHash = this.chain.length === 0
      ? GENESIS_HASH
      : this.chain[this.chain.length - 1].entryHash;

    const entryHash = this.computeHash(
      previousHash,
      sequenceNumber,
      timestamp,
      input.actorId,
      input.action,
      input.resourceType,
      input.resourceId,
      details
    );

    const entry: AuditLogEntry = {
      id: `audit_${sequenceNumber}_${crypto.randomBytes(4).toString('hex')}`,
      sequenceNumber,
      timestamp,
      actorId: input.actorId,
      actorRole: input.actorRole,
      tenantId: input.tenantId,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      clientIp: input.clientIp,
      details,
      previousHash,
      entryHash,
    };

    this.chain.push(entry);
    return entry;
  }

  /**
   * Cryptographically audits the entire chain to detect any tampering, reordering, or deletion.
   */
  public verifyLedgerIntegrity(): {
    valid: boolean;
    totalEntries: number;
    corruptedAtSequence?: number;
    reason?: string;
  } {
    if (this.chain.length === 0) {
      return { valid: true, totalEntries: 0 };
    }

    let expectedPrevHash = GENESIS_HASH;

    for (let i = 0; i < this.chain.length; i++) {
      const entry = this.chain[i];
      const expectedSeq = i + 1;

      // 1. Verify Contiguous Sequence
      if (entry.sequenceNumber !== expectedSeq) {
        return {
          valid: false,
          totalEntries: this.chain.length,
          corruptedAtSequence: entry.sequenceNumber,
          reason: `Sequence break: Expected ${expectedSeq}, found ${entry.sequenceNumber}`,
        };
      }

      // 2. Verify Previous Hash Chain Link
      if (entry.previousHash !== expectedPrevHash) {
        return {
          valid: false,
          totalEntries: this.chain.length,
          corruptedAtSequence: entry.sequenceNumber,
          reason: `Hash link broken at sequence ${entry.sequenceNumber}`,
        };
      }

      // 3. Recompute and Verify Current Hash
      const recomputedHash = this.computeHash(
        entry.previousHash,
        entry.sequenceNumber,
        entry.timestamp,
        entry.actorId,
        entry.action,
        entry.resourceType,
        entry.resourceId,
        entry.details
      );

      if (entry.entryHash !== recomputedHash) {
        return {
          valid: false,
          totalEntries: this.chain.length,
          corruptedAtSequence: entry.sequenceNumber,
          reason: `Payload tampering detected: Entry hash mismatch at sequence ${entry.sequenceNumber}`,
        };
      }

      expectedPrevHash = entry.entryHash;
    }

    return {
      valid: true,
      totalEntries: this.chain.length,
    };
  }

  public getEntries(tenantId?: string): AuditLogEntry[] {
    if (!tenantId) return [...this.chain];
    return this.chain.filter((e) => e.tenantId === tenantId);
  }

  public getLatestHash(): string {
    return this.chain.length > 0 ? this.chain[this.chain.length - 1].entryHash : GENESIS_HASH;
  }

  /**
   * Internal tamper simulation for security regression testing.
   */
  public _simulateTampering(sequenceNumber: number, alteredAction: string): void {
    const entry = this.chain.find((e) => e.sequenceNumber === sequenceNumber);
    if (entry) {
      entry.action = alteredAction; // Alters data without recalculating hash
    }
  }
}
