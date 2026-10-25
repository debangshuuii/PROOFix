import assert from 'node:assert';
import { McpTelemetryBroadcaster } from '../src/lib/mcp/telemetry.ts';

console.log('[TEST] McpTelemetryBroadcaster');
const b = new McpTelemetryBroadcaster();
let received = null;
const unsub = b.subscribe((ev) => { received = ev; });
b.broadcast('step_completed', { stepId: 'step_1', status: 'passed' });

assert(received !== null);
assert.strictEqual(received.type, 'step_completed');
assert.strictEqual(received.data.stepId, 'step_1');
unsub();
console.log('✓ McpTelemetryBroadcaster unit test passed.');
