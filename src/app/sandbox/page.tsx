import React from 'react';
import { SandboxIsolationReport } from '@/components/sandbox/SandboxIsolationReport';

export const metadata = {
  title: 'Sandbox & MicroVM Isolation | PROOFix Enterprise',
  description: 'Zero-trust process sandbox isolation, cgroup quotas, and cloud metadata defense',
};

export default function SandboxPage() {
  return (
    <main className="min-h-screen bg-slate-950 py-10">
      <SandboxIsolationReport />
    </main>
  );
}
