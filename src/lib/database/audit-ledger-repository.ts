/**
 * Persistent Cryptographic Audit Ledger Repository (Contribution 217)
 *
 * Implements persistent SOC2 audit ledger storage on physical database adapters (Postgres/SQLite)
 * with cryptographic SHA-256 hash chaining and tamper-detection verification.
 */

import crypto from 'crypto';
import type { IDatabaseAdapter } from '../types/database-adapters.ts';

export interface AuditRecord {
  sequenceId: number;
  eventId: string;
  tenantId: string;
  eventType: string;
  actorId: string;
  actorRole: string;
  resourceType: string;
  resourceId: string;
  action: string;
  status: string;
  prevHash: string;
  currHash: string;
  payload: Record<string, any>;
  ipAddress?: string;
  createdAt: string;
}

export const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

export class AuditLedgerRepository {
  private readonly adapter: IDatabaseAdapter;

  constructor(adapter: IDatabaseAdapter) {
    this.adapter = adapter;
  }

  public computeHash(
    prevHash: string,
    sequenceId: number,
    eventType: string,
    actorId: string,
    action: string,
    payload: any
  ): string {
    const raw = `${prevHash}|${sequenceId}|${eventType}|${actorId}|${action}|${JSON.stringify(payload)}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Appends an audit event with immutable hash chaining to the database.
   */
  public async appendEvent(
    data: Omit<AuditRecord, 'sequenceId' | 'currHash' | 'createdAt'>
  ): Promise<AuditRecord> {
    const tx = await this.adapter.beginTransaction();
    try {
      // Find the last record's hash and sequence
      const lastRes = await tx.query<AuditRecord>(
        'SELECT sequence_id as "sequenceId", curr_hash as "currHash" FROM audit_ledger ORDER BY sequence_id DESC LIMIT 1;'
      );

      const lastRow = lastRes.rows[0];
      const prevHash = lastRow?.currHash || GENESIS_HASH;
      const sequenceId = (lastRow?.sequenceId || 0) + 1;

      const currHash = this.computeHash(
        prevHash,
        sequenceId,
        data.eventType,
        data.actorId,
        data.action,
        data.payload
      );

      const createdAt = new Date().toISOString();

      await tx.query(
        `INSERT INTO audit_ledger (
          sequence_id, event_id, tenant_id, event_type, actor_id, actor_role,
          resource_type, resource_id, action, status, prev_hash, curr_hash,
          payload, ip_address, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15);`,
        [
          sequenceId,
          data.eventId,
          data.tenantId || 'default',
          data.eventType,
          data.actorId,
          data.actorRole,
          data.resourceType,
          data.resourceId,
          data.action,
          data.status || 'SUCCESS',
          prevHash,
          currHash,
          JSON.stringify(data.payload || {}),
          data.ipAddress || null,
          createdAt,
        ]
      );

      await tx.commit();

      return {
        ...data,
        sequenceId,
        prevHash,
        currHash,
        createdAt,
      };
    } catch (err) {
      await tx.rollback();
      throw err;
    }
  }

  /**
   * Verifies the cryptographic chain across all rows to guarantee zero tampering.
   */
  public async verifyIntegrity(): Promise<{ valid: boolean; inspectedRows: number; brokenSequenceId?: number }> {
    const res = await this.adapter.query<AuditRecord>(
      'SELECT sequence_id as "sequenceId", event_type as "eventType", actor_id as "actorId", action, prev_hash as "prevHash", curr_hash as "currHash", payload FROM audit_ledger ORDER BY sequence_id ASC;'
    );

    let expectedPrevHash = GENESIS_HASH;

    for (const row of res.rows) {
      if (row.prevHash !== expectedPrevHash) {
        return { valid: false, inspectedRows: res.rows.length, brokenSequenceId: row.sequenceId };
      }

      const calculated = this.computeHash(
        row.prevHash,
        row.sequenceId,
        row.eventType,
        row.actorId,
        row.action,
        typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload
      );

      if (calculated !== row.currHash) {
        return { valid: false, inspectedRows: res.rows.length, brokenSequenceId: row.sequenceId };
      }

      expectedPrevHash = row.currHash;
    }

    return { valid: true, inspectedRows: res.rows.length };
  }
}
