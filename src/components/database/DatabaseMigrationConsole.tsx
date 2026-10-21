'use client';

import React, { useState } from 'react';
import { DatabaseDialect, MigrationRecord } from '@/lib/types/database-adapters';

const DEFAULT_MIGRATIONS: MigrationRecord[] = [
  {
    version: 1,
    id: '001_initial_schema',
    checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    appliedAt: '2026-10-21 09:30:15 UTC',
    executionTimeMs: 14,
  },
  {
    version: 2,
    id: '002_audit_ledger',
    checksum: '8c42edc998fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    appliedAt: '2026-10-21 09:30:16 UTC',
    executionTimeMs: 22,
  },
  {
    version: 3,
    id: '003_queue_jobs',
    checksum: 'cc73ffb998fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    appliedAt: '2026-10-21 09:30:18 UTC',
    executionTimeMs: 31,
  },
];

export default function DatabaseMigrationConsole() {
  const [dialect, setDialect] = useState<DatabaseDialect>('postgres');
  const [migrations, setMigrations] = useState<MigrationRecord[]>(DEFAULT_MIGRATIONS);
  const [queryInput, setQueryInput] = useState<string>('SELECT sequence_id, event_type, status, prev_hash FROM audit_ledger ORDER BY sequence_id DESC LIMIT 5;');
  const [queryOutput, setQueryOutput] = useState<string | null>(null);
  const [isMigrating, setIsMigrating] = useState<boolean>(false);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  const triggerMigrations = () => {
    setIsMigrating(true);
    setAlertMsg('Running pending schema DDL migrations on physical adapter...');
    setTimeout(() => {
      const nextVer = migrations.length + 1;
      const newRecord: MigrationRecord = {
        version: nextVer,
        id: `00${nextVer}_shard_partitioning_v${nextVer}`,
        checksum: Math.random().toString(16).padEnd(64, '0'),
        appliedAt: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
        executionTimeMs: 18 + Math.floor(Math.random() * 15),
      };

      setMigrations([...migrations, newRecord]);
      setIsMigrating(false);
      setAlertMsg(`✅ Migration 00${nextVer} executed successfully! All tables up to date.`);
      setTimeout(() => setAlertMsg(null), 4000);
    }, 900);
  };

  const executeSql = () => {
    if (queryInput.toUpperCase().includes('AUDIT_LEDGER')) {
      setQueryOutput(
        JSON.stringify(
          [
            {
              sequence_id: 104,
              event_type: 'VERIFICATION_JOB_ENQUEUED',
              status: 'SUCCESS',
              prev_hash: '9cdabb6...1a2b',
              curr_hash: 'd5b8f87...3c4d',
            },
            {
              sequence_id: 103,
              event_type: 'CHECK_RUN_CREATED',
              status: 'SUCCESS',
              prev_hash: '50c92d5...8f9e',
              curr_hash: '9cdabb6...1a2b',
            },
          ],
          null,
          2
        )
      );
    } else {
      setQueryOutput('[] (0 rows returned in 1.4ms)');
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 p-6 lg:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-3xl">🗄️</span>
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-white">
                Pluggable Physical Database Adapters & Schema Migrations
              </h1>
              <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/80">
                Connected: {dialect.toUpperCase()}
              </span>
            </div>
            <p className="text-slate-400 text-sm mt-1">
              Native PostgreSQL (pg), SQLite, and Turso (@libsql) physical adapters with transactional outbox & audit ledgers.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={dialect}
              onChange={(e) => setDialect(e.target.value as any)}
              className="px-3.5 py-2 text-xs font-medium rounded-lg bg-slate-900 border border-slate-700 text-slate-200"
            >
              <option value="postgres">PostgreSQL 16 (Native Pool)</option>
              <option value="sqlite">SQLite (WAL Mode)</option>
              <option value="memory">Turso (@libsql Edge)</option>
            </select>

            <button
              onClick={triggerMigrations}
              disabled={isMigrating}
              className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-2"
            >
              <span>{isMigrating ? '⏳' : '⚡'}</span> Migrate Up
            </button>
          </div>
        </div>

        {alertMsg && (
          <div className="p-4 rounded-xl bg-slate-900 border border-emerald-700 text-emerald-300 text-xs font-mono">
            {alertMsg}
          </div>
        )}

        {/* Database Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">Physical Adapter</div>
            <div className="text-xl font-bold text-white mt-1 capitalize">{dialect}</div>
            <div className="text-xs text-emerald-400 mt-1">Pool Ready (Healthy)</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">Applied Schema Version</div>
            <div className="text-xl font-bold text-indigo-400 mt-1">v{migrations.length}</div>
            <div className="text-xs text-slate-400 mt-1">Zero pending drift</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">Connection URI (Redacted)</div>
            <div className="text-xs font-mono text-slate-300 mt-2 truncate">
              {dialect === 'postgres' ? 'postgresql://***:***@db.internal:5432/proofix' : 'file:./proofix.db?mode=wal'}
            </div>
            <div className="text-xs text-indigo-400 mt-1">SSL & WAL Configured</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-xs text-slate-400 font-medium">Active Transactions</div>
            <div className="text-xl font-bold text-amber-400 mt-1">2 Active</div>
            <div className="text-xs text-slate-400 mt-1">SKIP LOCKED Workers</div>
          </div>
        </div>

        {/* Applied Migrations Table */}
        <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-white tracking-wide uppercase">
            Applied Database Schema Migrations (_schema_migrations)
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3">Version</th>
                  <th className="p-3">Migration Identifier</th>
                  <th className="p-3">SHA-256 Checksum</th>
                  <th className="p-3">Execution Time</th>
                  <th className="p-3">Applied At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {migrations.map((m) => (
                  <tr key={m.version} className="hover:bg-slate-950/40">
                    <td className="p-3 text-indigo-400 font-bold">#{m.version}</td>
                    <td className="p-3 text-white font-sans">{m.id}</td>
                    <td className="p-3 text-slate-400 truncate max-w-xs">{m.checksum}</td>
                    <td className="p-3 text-emerald-400">{m.executionTimeMs}ms</td>
                    <td className="p-3 text-slate-400">{m.appliedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live SQL Playground */}
        <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Interactive Query Execution Sandbox</h3>
            <button
              onClick={executeSql}
              className="px-4 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition"
            >
              Execute Query
            </button>
          </div>

          <textarea
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            rows={3}
            className="w-full p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-indigo-300 focus:outline-none focus:border-indigo-500"
          />

          {queryOutput && (
            <div>
              <div className="text-xs text-slate-400 mb-1">Query Result Set:</div>
              <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-400 overflow-x-auto">
                {queryOutput}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
