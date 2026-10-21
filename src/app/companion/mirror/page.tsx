import React from 'react';
import RealtimeCompanionMirror from '@/components/companion/RealtimeCompanionMirror';

export const metadata = {
  title: 'Live Companion Mirror | PROOFix',
  description: 'Ultra-low latency (<50ms) WebRTC & WebSocket 60 FPS viewport mirroring and interactive step-debugging.',
};

export default function CompanionMirrorPage() {
  return <RealtimeCompanionMirror />;
}
