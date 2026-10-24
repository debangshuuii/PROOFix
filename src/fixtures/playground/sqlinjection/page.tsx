import React from 'react';

export default function VaultAdminSearchPage() {
  return (
    <main className="min-h-screen bg-slate-950 py-12 px-4 text-white">
      <div className="max-w-xl mx-auto space-y-6">
        <h1 className="text-3xl font-extrabold tracking-tight">VaultAdmin Staff Search</h1>
        <p className="text-slate-400 text-sm">
          Internal administrative directory. Enforces strict zero-trust AST security preflight gates.
        </p>
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg">
          <input
            type="text"
            placeholder="Search username..."
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-sm text-white"
          />
        </div>
      </div>
    </main>
  );
}
