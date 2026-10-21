# 🗄️ Pluggable Physical Database Adapters & Schema Migrations

## Overview
PROOFix provides a native physical adapter layer supporting **PostgreSQL** (`pg`) and **SQLite / Turso** (`@libsql/client`), along with automated SQL schema DDL migrations, persistent cryptographic audit ledgers, and atomic transactional outbox publishing.

```
                  ┌─────────────────────────────────────────┐
                  │        DatabaseAdapterFactory           │
                  └────────────────────┬────────────────────┘
                                       │
                      Resolves by DATABASE_URL protocol
                                       │
               ┌───────────────────────┴───────────────────────┐
               ▼                                               ▼
   ┌───────────────────────┐                       ┌───────────────────────┐
   │    PostgresAdapter    │                       │     SqliteAdapter     │
   │  (PostgreSQL 16 Pool) │                       │  (WAL Mode / Turso)   │
   └───────────┬───────────┘                       └───────────┬───────────┘
               │                                               │
               └───────────────────────┬───────────────────────┘
                                       │
               ┌───────────────────────┴───────────────────────┐
               ▼                                               ▼
   ┌───────────────────────┐                       ┌───────────────────────┐
   │  AuditLedgerRepository│                       │   OutboxRepository    │
   │  (SHA-256 Hash Chain) │                       │ (Queue Jobs & Outbox) │
   └───────────────────────┘                       └───────────────────────┘
```

## Features Implemented (Contributions 211–220)

1. **Pluggable Database Adapter Type System (`src/lib/types/database-adapters.ts`)**:
   - `IDatabaseAdapter`, `DatabaseAdapterConfig`, `QueryResult`, `TransactionSession`, `MigrationScript`.

2. **Automated Raw SQL Schema DDL Migrations (`src/lib/database/migrations/*.sql`)**:
   - `001_initial_schema.sql`: Tracks versioning in `_schema_migrations`.
   - `002_audit_ledger.sql`: Immutable cryptographic audit ledger table with index optimizations.
   - `003_queue_jobs.sql`: High-throughput queue jobs and transactional outbox events.

3. **Automated Migration Runner (`src/lib/database/migration-runner.ts`)**:
   - Computes SHA-256 checksums per script, detects schema drift, and applies migrations in atomic transactions.

4. **Native PostgreSQL Adapter (`src/lib/database/postgres-adapter.ts`)**:
   - Handles connection pooling, `$1` parameter replacement, and transaction rollback/commit semantics.

5. **SQLite & Turso Adapter (`src/lib/database/sqlite-adapter.ts`)**:
   - Embedded and edge support with WAL mode (`PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;`).

6. **Pluggable Adapter Factory & Health Inspector (`src/lib/database/adapter-factory.ts`)**:
   - Protocol-based resolution (`postgres://`, `file:`, `libsql://`), credential scrubbing, and health ping.

7. **Cryptographic Audit Ledger Repository (`src/lib/database/audit-ledger-repository.ts`)**:
   - SHA-256 chained audit events with sequence verification and tamper detection.

8. **Transactional Outbox & Queue Job Repository (`src/lib/database/outbox-repository.ts`)**:
   - Atomic job and outbox creation, lock-free job leasing, retry exponential backoff, and dead-letter queuing.

9. **Database Sharding & Schema Migration Console UI (`src/components/database/DatabaseMigrationConsole.tsx`)**:
   - Physical adapter status inspector, migration logs, and live SQL execution sandbox at `/database`.

10. **Automated CI Suite**:
    - `npm run test:db` (`tests/verify-database-adapters-ci.mjs`).
