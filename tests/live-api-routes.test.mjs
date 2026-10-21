import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { globalCompanionSessionManager } from '../src/lib/companion/companion-session-manager.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('--- Testing Live Companion SSE and Control API Routes (Contribution 128) ---');

function testRouteFilesExist() {
  const liveRoutePath = path.join(__dirname, '..', 'src', 'app', 'api', 'v1', 'runs', '[id]', 'live', 'route.ts');
  const controlRoutePath = path.join(__dirname, '..', 'src', 'app', 'api', 'v1', 'runs', '[id]', 'control', 'route.ts');

  assert.ok(fs.existsSync(liveRoutePath), 'runs/[id]/live/route.ts must exist');
  assert.ok(fs.existsSync(controlRoutePath), 'runs/[id]/control/route.ts must exist');

  const liveContent = fs.readFileSync(liveRoutePath, 'utf8');
  assert.ok(liveContent.includes('text/event-stream'));
  assert.ok(liveContent.includes('globalTelemetryBroadcaster.subscribe'));

  const controlContent = fs.readFileSync(controlRoutePath, 'utf8');
  assert.ok(controlContent.includes('globalCompanionSessionManager.executeAction'));

  console.log('[PASS] API route files exist and wire live telemetry streams and control dispatchers.');
}

function testControlActionExecution() {
  const runId = 'run_route_test_01';
  globalCompanionSessionManager.createSession(runId, 5);

  // 1. Pause
  const pause = globalCompanionSessionManager.executeAction(runId, 'pause');
  assert.equal(pause.success, true);
  assert.equal(pause.state, 'paused');

  // 2. Set Breakpoint
  const bp = globalCompanionSessionManager.executeAction(runId, 'set_breakpoint', {
    stepIndex: 4,
    condition: 'always',
  });
  assert.equal(bp.success, true);

  // 3. Resume
  const resume = globalCompanionSessionManager.executeAction(runId, 'resume');
  assert.equal(resume.success, true);
  assert.equal(resume.state, 'running');

  // 4. Invalid action
  const invalid = globalCompanionSessionManager.executeAction(runId, 'unsupported_action');
  assert.equal(invalid.success, false);
  assert.ok(invalid.error?.includes('Unsupported'));

  globalCompanionSessionManager.terminateSession(runId);
  console.log('[PASS] Control route backend dispatcher successfully validates and executes stepper actions.');
}

testRouteFilesExist();
testControlActionExecution();
console.log('\nAll Contribution 128 tests passed cleanly!');
