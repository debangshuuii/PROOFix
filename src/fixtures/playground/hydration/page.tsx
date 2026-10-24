import React from 'react';
import { LiveServerClock } from './LiveServerClock';

export default function HydrationDemoPage() {
  return (
    <main className="min-h-screen bg-slate-950 py-12 px-4 text-white">
      <div className="max-w-xl mx-auto space-y-6">
        <h1 className="text-3xl font-extrabold tracking-tight">PulseOps Node Health Monitor</h1>
        <p className="text-slate-400 text-sm">
          Displays real-time cluster timestamp sync and health indicators.
        </p>
        <LiveServerClock />
      </div>
    </main>
  );
}
