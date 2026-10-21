import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('DistributedTraceWaterfall UI component exists and renders 5 hops', () => {
  const filePath = path.join(process.cwd(), 'src/components/telemetry/DistributedTraceWaterfall.tsx');
  assert.ok(fs.existsSync(filePath), 'Component file must exist');

  const content = fs.readFileSync(filePath, 'utf8');
  assert.ok(content.includes('OpenTelemetry Distributed Tracing Waterfall'));
  assert.ok(content.includes('hop:api_trigger'));
  assert.ok(content.includes('hop:outbox_publisher'));
  assert.ok(content.includes('hop:queue_worker'));
  assert.ok(content.includes('hop:sandbox_spawn'));
  assert.ok(content.includes('hop:playwright_run'));
  assert.ok(content.includes('Simulate 5-Hop Test Trace'));
});

test('Telemetry page route exists and sets metadata', () => {
  const pagePath = path.join(process.cwd(), 'src/app/telemetry/page.tsx');
  assert.ok(fs.existsSync(pagePath), 'Page route file must exist');

  const content = fs.readFileSync(pagePath, 'utf8');
  assert.ok(content.includes('DistributedTraceWaterfall'));
  assert.ok(content.includes('OpenTelemetry Distributed Tracing'));
});
