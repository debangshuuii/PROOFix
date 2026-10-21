import React from 'react';
import ChaosMonkeyVisualizer from '@/components/crawler/ChaosMonkeyVisualizer';

export const metadata = {
  title: 'Autonomous Chaos Monkey Crawler | PROOFix',
  description: 'Autonomous vision-language crawler exploring arbitrary links, injecting edge-case fuzzing payloads, and trapping zero-day errors.',
};

export default function CrawlerPage() {
  return <ChaosMonkeyVisualizer />;
}
