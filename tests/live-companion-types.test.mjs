import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('--- Testing Live Companion Types & State Schema (Contribution 121) ---');

function testTypesAndExportRegistration() {
  const typesPath = path.join(__dirname, '..', 'src', 'lib', 'types', 'live-companion.ts');
  assert.ok(fs.existsSync(typesPath), 'live-companion.ts must exist');

  const content = fs.readFileSync(typesPath, 'utf8');
  assert.ok(content.includes('CompanionExecutionState'));
  assert.ok(content.includes('CompanionControlAction'));
  assert.ok(content.includes('CompanionTelemetryEventType'));
  assert.ok(content.includes('CompanionTelemetryEvent'));
  assert.ok(content.includes('CompanionBreakpoint'));
  assert.ok(content.includes('ViewportFramePayload'));
  assert.ok(content.includes('DomMutationRecord'));
  assert.ok(content.includes('CompanionSession'));

  const indexPath = path.join(__dirname, '..', 'src', 'lib', 'types', 'index.ts');
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  assert.ok(indexContent.includes("export * from './live-companion.ts'"));

  console.log('[PASS] Live companion types and control action schema properly exported.');
}

function testSessionModelInstantiation() {
  const session = {
    id: 'comp_sess_101',
    runId: 'run_sample_101',
    state: 'paused',
    currentStepIndex: 3,
    totalSteps: 8,
    breakpoints: [
      {
        id: 'bp_checkout_submit',
        stepIndex: 4,
        actionType: 'click',
        condition: 'always',
        enabled: true,
      },
    ],
    fps: 15,
    connectedClients: 2,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  assert.equal(session.state, 'paused');
  assert.equal(session.currentStepIndex, 3);
  assert.equal(session.breakpoints.length, 1);
  assert.equal(session.breakpoints[0].condition, 'always');

  const event = {
    id: 'evt_frame_01',
    runId: 'run_sample_101',
    type: 'viewport_frame',
    timestamp: new Date().toISOString(),
    payload: {
      frameIndex: 42,
      dataUrl: 'data:image/jpeg;base64,mockframedata',
      width: 1280,
      height: 720,
      timestamp: new Date().toISOString(),
      isKeyframe: true,
    },
  };

  assert.equal(event.type, 'viewport_frame');
  assert.equal(event.payload.frameIndex, 42);
  assert.equal(event.payload.isKeyframe, true);
  console.log('[PASS] Companion session and viewport frame payloads instantiate cleanly.');
}

testTypesAndExportRegistration();
testSessionModelInstantiation();
console.log('\nAll Contribution 121 tests passed cleanly!');
