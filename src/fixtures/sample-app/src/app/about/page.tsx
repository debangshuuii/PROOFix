import React from 'react';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <div style={{ maxWidth: 800, margin: '40px auto', padding: 24 }}>
      <header style={{ borderBottom: '1px solid #334155', paddingBottom: 16, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: 24 }}>About PROOFix Testbed</h1>
        <Link href="/" style={{ color: '#38bdf8' }}>Back to Home</Link>
      </header>

      <main style={{ backgroundColor: '#1e293b', padding: 24, borderRadius: 8 }}>
        <h2>Application Architecture</h2>
        <p>This page confirms that multi-page routing and internal anchor navigation function correctly.</p>
        <ul>
          <li>Framework: Next.js App Router</li>
          <li>SSR / Client Hydration: Active</li>
          <li>Route Path: /about</li>
        </ul>
      </main>
    </div>
  );
}
