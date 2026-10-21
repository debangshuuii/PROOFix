import React from 'react';
import DistributedTraceWaterfall from '@/components/telemetry/DistributedTraceWaterfall';

export const metadata = {
  title: 'OpenTelemetry Distributed Tracing | PROOFix',
  description: 'W3C Distributed Tracing Waterfall and OTLP Spans across the 5 test execution lifecycle hops.',
};

export default function TelemetryPage() {
  return <DistributedTraceWaterfall />;
}
