'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export default function HomePage() {
  const [count, setCount] = useState(0);
  const [apiStatus, setApiStatus] = useState<string | null>(null);

  const fetchApi = async () => {
    setApiStatus('Fetching...');
    try {
      const res = await fetch('/api/data');
      if (!res.ok) {
        setApiStatus(`Error: HTTP ${res.status} ${res.statusText}`);
      } else {
        const json = await res.json();
        setApiStatus(`Success: ${JSON.stringify(json)}`);
      }
    } catch (err: any) {
      setApiStatus(`Failed: ${err.message}`);
    }
  };

  const triggerError = () => {
    // Uncaught exception for error boundary / console error verification
    (window as any).nonExistentObject.triggerFatalCrash();
  };

  return (
    <div style={{ maxWidth: 800, margin: '40px auto', padding: 24 }}>
      <header style={{ borderBottom: '1px solid #334155', paddingBottom: 16, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: 24 }}>PROOFix Testbed Application</h1>
        <nav style={{ display: 'flex', gap: 16 }}>
          <Link href="/" style={{ color: '#38bdf8' }}>Home</Link>
          <Link href="/about" style={{ color: '#94a3b8' }}>About</Link>
          {/* Intentionally broken link to demonstrate 404 detection */}
          <Link href="/broken-route" style={{ color: '#f87171' }}>Broken Link (404)</Link>
        </nav>
      </header>

      <main>
        <section style={{ backgroundColor: '#1e293b', padding: 24, borderRadius: 8, marginBottom: 24 }}>
          <h2>Interactive State Check</h2>
          <p>Click the button below to test client-side React hydration and event dispatch.</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
              id="increment-btn"
              onClick={() => setCount((c) => c + 1)}
              style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer' }}
            >
              Increment Counter
            </button>
            <span id="counter-value" style={{ fontSize: 18, fontWeight: 'bold' }}>Count: {count}</span>
          </div>
        </section>

        <section style={{ backgroundColor: '#1e293b', padding: 24, borderRadius: 8, marginBottom: 24 }}>
          <h2>API Failure Check (/api/data)</h2>
          <p>Calls an internal API route configured to fail with HTTP 500.</p>
          <button
            id="call-api-btn"
            onClick={fetchApi}
            style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer' }}
          >
            Call Unhealthy API
          </button>
          {apiStatus && <p id="api-result" style={{ marginTop: 12, color: '#fca5a5' }}>{apiStatus}</p>}
        </section>

        <section style={{ backgroundColor: '#1e293b', padding: 24, borderRadius: 8 }}>
          <h2>Uncaught JS Exception Check</h2>
          <p>Triggers an unhandled client-side TypeError.</p>
          <button
            id="trigger-error-btn"
            onClick={triggerError}
            style={{ backgroundColor: '#e11d48', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer' }}
          >
            Trigger Uncaught Exception
          </button>
        </section>
      </main>
    </div>
  );
}
