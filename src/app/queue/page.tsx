import React from 'react';
import { DistributedQueueDashboard } from '@/components/queue/DistributedQueueDashboard';

export const metadata = {
  title: 'Distributed Queue & Database Architecture | PROOFix Enterprise',
  description: 'Priority queuing, transactional outbox relays, and Dead Letter Queue management',
};

export default function QueuePage() {
  return (
    <main className="min-h-screen bg-slate-950 py-10">
      <DistributedQueueDashboard />
    </main>
  );
}
