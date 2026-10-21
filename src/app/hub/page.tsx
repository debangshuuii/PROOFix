import React from 'react';
import { EnterprisePortalHub } from '@/components/navigation/EnterprisePortalHub';

export const metadata = {
  title: 'Enterprise Operations Hub | PROOFix',
  description: 'Mission control connecting zero-trust sandboxes, distributed queues, and SOC2 governance',
};

export default function HubPage() {
  return (
    <main className="min-h-screen bg-slate-950 py-10">
      <EnterprisePortalHub />
    </main>
  );
}
