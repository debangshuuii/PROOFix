'use client';

import React from 'react';

/**
 * Vulnerable Component: Direct execution of Date().toLocaleTimeString()
 * during SSR execution results in immediate client-side hydration mismatch.
 */
export function LiveServerClock() {
  const time = new Date().toLocaleTimeString();

  return (
    <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg">
      <div className="text-xs uppercase tracking-wider text-slate-400 mb-1">
        Telemetry Live Server Time
      </div>
      <div id="live-server-clock" className="font-mono text-sky-400 font-bold text-lg">
        {time}
      </div>
    </div>
  );
}
