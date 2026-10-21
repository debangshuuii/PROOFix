import React from 'react';
import { GovernanceComplianceDashboard } from '@/components/governance/GovernanceComplianceDashboard';

export const metadata = {
  title: 'Enterprise Governance & SOC2 Compliance | PROOFix',
  description: 'Automated SOC2 Type II compliance reports, cryptographic audit trails, and RBAC governance',
};

export default function GovernancePage() {
  return (
    <main className="min-h-screen bg-slate-950 py-10">
      <GovernanceComplianceDashboard />
    </main>
  );
}
