import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AuditLedgerRepository,
  GENESIS_HASH,
} from '../src/lib/database/audit-ledger-repository.ts';

function createMockAdapter() {
  const rows = [];
  return {
    dialect: 'memory',
    isConnected: () => true,
    connect: async () => {},
    disconnect: async () => {},
    query: async (sql) => {
      if (sql.includes('ORDER BY sequence_id DESC LIMIT 1')) {
        const last = rows.length > 0 ? [rows[rows.length - 1]] : [];
        return { rows: last, rowCount: last.length, command: 'SELECT', durationMs: 1 };
      }
      if (sql.includes('ORDER BY sequence_id ASC')) {
        return { rows: [...rows], rowCount: rows.length, command: 'SELECT', durationMs: 1 };
      }
      return { rows: [], rowCount: 0, command: 'OK', durationMs: 1 };
    },
    beginTransaction: async () => {
      let pendingInsert = null;
      return {
        query: async (sql, params = []) => {
          if (sql.includes('ORDER BY sequence_id DESC LIMIT 1')) {
            const last = rows.length > 0 ? [rows[rows.length - 1]] : [];
            return { rows: last, rowCount: last.length, command: 'SELECT', durationMs: 1 };
          }
          if (sql.includes('INSERT INTO audit_ledger')) {
            pendingInsert = {
              sequenceId: params[0],
              eventId: params[1],
              tenantId: params[2],
              eventType: params[3],
              actorId: params[4],
              actorRole: params[5],
              resourceType: params[6],
              resourceId: params[7],
              action: params[8],
              status: params[9],
              prevHash: params[10],
              currHash: params[11],
              payload: params[12],
              createdAt: params[14],
            };
            return { rows: [], rowCount: 1, command: 'INSERT', durationMs: 1 };
          }
          return { rows: [], rowCount: 0, command: 'OK', durationMs: 1 };
        },
        commit: async () => {
          if (pendingInsert) rows.push(pendingInsert);
        },
        rollback: async () => {},
      };
    },
  };
}

test('AuditLedgerRepository creates genesis block and chains subsequent events', async () => {
  const adapter = createMockAdapter();
  const repo = new AuditLedgerRepository(adapter);

  const event1 = await repo.appendEvent({
    eventId: 'evt-1',
    tenantId: 'tenant-acme',
    eventType: 'USER_LOGIN',
    actorId: 'user-42',
    actorRole: 'admin',
    resourceType: 'auth_session',
    resourceId: 'sess-99',
    action: 'authenticate',
    status: 'SUCCESS',
    payload: { mfa: true },
  });

  assert.equal(event1.sequenceId, 1);
  assert.equal(event1.prevHash, GENESIS_HASH);
  assert.equal(event1.currHash.length, 64);

  const event2 = await repo.appendEvent({
    eventId: 'evt-2',
    tenantId: 'tenant-acme',
    eventType: 'POLICY_UPDATE',
    actorId: 'user-42',
    actorRole: 'admin',
    resourceType: 'rbac_policy',
    resourceId: 'pol-55',
    action: 'update',
    status: 'SUCCESS',
    payload: { grant: 'write' },
  });

  assert.equal(event2.sequenceId, 2);
  assert.equal(event2.prevHash, event1.currHash);
  assert.notEqual(event2.currHash, event1.currHash);

  const verify = await repo.verifyIntegrity();
  assert.equal(verify.valid, true);
  assert.equal(verify.inspectedRows, 2);
});
