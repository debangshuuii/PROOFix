import React from 'react';
import GitIntegrationDashboard from '@/components/integrations/GitIntegrationDashboard';

export const metadata = {
  title: 'Git Integrations & Check Runs | PROOFix',
  description: 'Native GitHub App and GitLab Webhook Ingestion, Check Runs, and 1-Click Self-Healing PR Comments.',
};

export default function GitIntegrationPage() {
  return <GitIntegrationDashboard />;
}
