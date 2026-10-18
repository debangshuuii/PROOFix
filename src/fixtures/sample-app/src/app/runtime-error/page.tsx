'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';

export default function RuntimeErrorPage() {
  useEffect(() => {
    // Uncaught exception on mount
    const timer = setTimeout(() => {
      (window as any).crashTarget.explode();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{ maxWidth: 800, margin: '40px auto', padding: 24 }}>
      <h1>Runtime Error Demonstration</h1>
      <p>This route intentionally throws an unhandled client-side TypeError on mount to verify browser error listening.</p>
      <Link href="/" style={{ color: '#38bdf8' }}>Back to Home</Link>
    </div>
  );
}
