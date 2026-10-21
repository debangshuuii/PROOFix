/**
 * PROOFix Master Real-Time Interactive Companion & Live Browser Mirroring CI Suite
 * Covering Point 3 / Contributions 121 through 130
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 1. Broadcaster (Contribution 122)
import {
  TelemetryBroadcaster,
  globalTelemetryBroadcaster,
} from '../src/lib/companion/telemetry-broadcaster.ts';

// 2. Breakpoint Manager (Contribution 123)
import { BreakpointManager } from '../src/lib/companion/breakpoint-manager.ts';

// 3. Step Controller (Contribution 124)
import { StepController } from '../src/lib/companion/step-controller.ts';

// 4. Viewport Frame Streamer (Contribution 125)
import { FrameStreamer } from '../src/lib/companion/frame-streamer.ts';

// 5. DOM Mutation Tracker (Contribution 126)
import { DomMutationTracker } from '../src/lib/companion/dom-mutation-tracker.ts';

// 6. Companion Session Manager (Contribution 127)
import {
  CompanionSessionManager,
  globalCompanionSessionManager,
} from '../src/lib/companion/companion-session-manager.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('================================================================');
console.log(' PROOFix Master Real-Time Live Companion CI Regression Suite    ');
console.log(' Feature: Interactive Companion & Mirroring (121–130)           ');
console.log('================================================================\n');

async function runMasterLiveCompanionSuite() {
  const testRunId = 'run_ci_companion_master';

  // --------------------------------------------------------------------------
  // Test 1: Telemetry Event Schema & SSE Protocol (Contributions 121 & 122)
  // --------------------------------------------------------------------------
  console.log('▶ Test 1: Verifying Telemetry Broadcaster & SSE formatting...');
  const broadcaster = new TelemetryBroadcaster();
  const emittedEvents = [];

  const unsubscribe = broadcaster.subscribe(testRunId, (chunk) => {
    emittedEvents.push(chunk);
  });

  broadcaster.broadcast(testRunId, 'step_start', {
    stepIndex: 1,
    actionType: 'navigate',
    target: 'https://proofix.dev',
  });

  broadcaster.broadcast(testRunId, 'console_log', {
    level: 'info',
    text: 'Hydrated successfully in 120ms',
  });

  assert.equal(emittedEvents.length, 2, 'Must receive all broadcasted SSE chunks');
  assert.ok(emittedEvents[0].includes('event: step_start\n'), 'First event must be step_start');
  assert.ok(emittedEvents[1].includes('event: console_log\n'), 'Second event must be console_log');

  const sampleEvent = {
    id: 'evt_sample_01',
    runId: testRunId,
    type: 'state_change',
    timestamp: new Date().toISOString(),
    payload: { state: 'paused', stepIndex: 1 },
  };
  const sseChunk = TelemetryBroadcaster.formatSseEvent(sampleEvent);
  assert.ok(sseChunk.startsWith('id: evt_sample_01\n'), 'SSE chunk must start with id line');
  assert.ok(sseChunk.includes('event: state_change\n'), 'SSE chunk must have event type line');
  assert.ok(sseChunk.includes('data: {"id":"evt_sample_01"'), 'SSE chunk must have JSON data line');
  assert.ok(sseChunk.endsWith('\n\n'), 'SSE chunk must end with double newline');

  unsubscribe();
  console.log('  ✔ Telemetry broadcaster & SSE formatting passed');

  // --------------------------------------------------------------------------
  // Test 2: Breakpoint Manager & Conditional Rules (Contribution 123)
  // --------------------------------------------------------------------------
  console.log('▶ Test 2: Verifying Breakpoint Manager & conditional evaluations...');
  const bpManager = new BreakpointManager();

  const bp = bpManager.addBreakpoint({
    stepIndex: 4,
    condition: 'always',
    actionType: 'click',
    enabled: true,
  });

  bpManager.addBreakpoint({
    condition: 'on_failure',
    enabled: true,
  });

  bpManager.addBreakpoint({
    condition: 'url_match',
    targetPattern: '/checkout',
    enabled: true,
  });

  assert.equal(bpManager.getBreakpoints().length, 3);

  // Match check
  const hitStep = bpManager.evaluate({
    stepIndex: 4,
    actionType: 'click',
  });
  assert.equal(hitStep.shouldPause, true, 'Must trigger step 4 click breakpoint');

  const hitFail = bpManager.evaluate({
    stepIndex: 2,
    actionType: 'click',
    errorOccurred: true,
    errorMessage: 'Button disabled',
  });
  assert.equal(hitFail.shouldPause, true, 'Must trigger on_failure breakpoint');

  const hitUrl = bpManager.evaluate({
    stepIndex: 5,
    actionType: 'navigate',
    currentUrl: 'https://proofix.dev/checkout/pay',
  });
  assert.equal(hitUrl.shouldPause, true, 'Must trigger url_match breakpoint on /checkout pattern');

  bpManager.removeBreakpoint(bp.id);
  assert.equal(bpManager.getBreakpoints().length, 2);
  console.log('  ✔ Breakpoint manager evaluations passed');

  // --------------------------------------------------------------------------
  // Test 3: Step Controller & Execution Barrier (Contribution 124)
  // --------------------------------------------------------------------------
  console.log('▶ Test 3: Verifying Execution Step Controller & barrier promise...');
  const stepController = new StepController({
    runId: 'ci_run_step_barrier',
    totalSteps: 5,
    broadcaster,
    breakpointManager: bpManager,
  });
  assert.equal(stepController.getState(), 'running');

  stepController.pause();
  assert.equal(stepController.getState(), 'paused');

  let barrierReleased = false;
  const barrierWait = (async () => {
    await stepController.beforeStep(1, 'click', 'button#submit');
    barrierReleased = true;
  })();

  // Small delay to ensure it waits
  await new Promise((r) => setTimeout(r, 40));
  assert.equal(barrierReleased, false, 'Barrier must hold while paused');

  // Step next
  stepController.stepNext();
  await barrierWait;
  await stepController.afterStep(1, 'click', { success: true });
  assert.equal(barrierReleased, true, 'Stepping next must release the barrier');
  assert.equal(stepController.getState(), 'paused', 'After step next completes, controller re-pauses');

  stepController.resume();
  assert.equal(stepController.getState(), 'running');
  console.log('  ✔ Step controller barrier execution passed');

  // --------------------------------------------------------------------------
  // Test 4: Viewport Frame Streamer & FPS Throttling (Contribution 125)
  // --------------------------------------------------------------------------
  console.log('▶ Test 4: Verifying Viewport Frame Streamer & FPS limiter...');
  const frameStreamer = new FrameStreamer({
    targetFps: 5, // 200ms min interval
    broadcaster,
  });

  const dummyPng = Buffer.from('dummy-frame-1');
  const dummyPng2 = Buffer.from('dummy-frame-2');

  const p1 = frameStreamer.pushFrame(testRunId, dummyPng, { width: 1280, height: 720 });
  assert.ok(p1, 'First frame must be emitted');

  // Immediate subsequent frame without time passing should be throttled
  const p2 = frameStreamer.pushFrame(testRunId, dummyPng2, { width: 1280, height: 720 });
  assert.equal(p2, null, 'Subsequent frame within 200ms interval must be throttled');

  // Wait for 220ms (> 200ms)
  await new Promise((r) => setTimeout(r, 220));
  const p3 = frameStreamer.pushFrame(testRunId, dummyPng2, { width: 1280, height: 720 });
  assert.ok(p3, 'Frame emitted after interval elapsed must succeed');

  const stats = frameStreamer.getStats();
  assert.equal(stats.totalFramesIngested, 3);
  assert.equal(stats.fpsThrottledFramesDropped, 1);
  console.log('  ✔ Viewport frame streamer passed');

  // --------------------------------------------------------------------------
  // Test 5: DOM Mutation Tracker & Noise Filtering (Contribution 126)
  // --------------------------------------------------------------------------
  console.log('▶ Test 5: Verifying DOM Mutation Tracker & noise filter...');
  const mutationTracker = new DomMutationTracker(testRunId, {}, broadcaster);

  const reactNoise = {
    type: 'attributes',
    targetSelector: 'div#root',
    attributeName: 'data-reactroot',
  };
  const scriptNoise = {
    type: 'childList',
    targetSelector: 'script#analytics',
    addedNodesCount: 1,
  };
  const meaningfulMutation = {
    type: 'childList',
    targetSelector: 'div.product-card',
    addedNodesCount: 2,
  };

  assert.equal(mutationTracker.isMeaningfulMutation(reactNoise), false);
  assert.equal(mutationTracker.isMeaningfulMutation(scriptNoise), false);
  assert.equal(mutationTracker.isMeaningfulMutation(meaningfulMutation), true);

  const rawBatch = [reactNoise, scriptNoise, meaningfulMutation];
  const recorded = mutationTracker.recordMutations(1, rawBatch);
  assert.equal(recorded.length, 1);
  assert.equal(mutationTracker.getStepMutations(1).length, 1);
  console.log('  ✔ DOM mutation tracker passed');

  // --------------------------------------------------------------------------
  // Test 6: Companion Session Manager (Contribution 127)
  // --------------------------------------------------------------------------
  console.log('▶ Test 6: Verifying Companion Session Manager unified orchestration...');
  const sessionManager = new CompanionSessionManager(broadcaster, frameStreamer);
  const sessionContext = sessionManager.createSession('ci_run_integrated_103', 6, 15);

  assert.equal(sessionContext.session.runId, 'ci_run_integrated_103');
  assert.equal(sessionContext.session.state, 'running');

  // Dispatch pause action
  const pauseResult = sessionManager.executeAction('ci_run_integrated_103', 'pause');
  assert.equal(pauseResult.success, true);
  assert.equal(pauseResult.state, 'paused');

  // Dispatch resume action
  const resumeResult = sessionManager.executeAction('ci_run_integrated_103', 'resume');
  assert.equal(resumeResult.success, true);
  assert.equal(resumeResult.state, 'running');

  // Terminate session
  sessionManager.terminateSession('ci_run_integrated_103');
  assert.equal(sessionManager.getContext('ci_run_integrated_103'), undefined);
  console.log('  ✔ Companion session manager passed');

  // --------------------------------------------------------------------------
  // Test 7: API Route Handlers (Contribution 128)
  // --------------------------------------------------------------------------
  console.log('▶ Test 7: Verifying Live Streaming & Stepper Control API routes...');
  const liveRoutePath = path.resolve(__dirname, '../src/app/api/v1/runs/[id]/live/route.ts');
  const controlRoutePath = path.resolve(__dirname, '../src/app/api/v1/runs/[id]/control/route.ts');

  assert.ok(fs.existsSync(liveRoutePath), 'Live SSE route must exist');
  assert.ok(fs.existsSync(controlRoutePath), 'Stepper control route must exist');

  const liveSource = fs.readFileSync(liveRoutePath, 'utf8');
  assert.ok(liveSource.includes('export async function GET'), 'Live route must export GET handler');
  assert.ok(liveSource.includes('text/event-stream'), 'Live route must set text/event-stream header');

  const controlSource = fs.readFileSync(controlRoutePath, 'utf8');
  assert.ok(controlSource.includes('export async function POST'), 'Control route must export POST handler');
  assert.ok(controlSource.includes('executeAction'), 'Control route must invoke executeAction');
  console.log('  ✔ API route handlers verified');

  // --------------------------------------------------------------------------
  // Test 8: Live Companion UI Component & Tabs (Contribution 129)
  // --------------------------------------------------------------------------
  console.log('▶ Test 8: Verifying Live Companion Dashboard UI & Page Tab Integration...');
  const dashboardPath = path.resolve(__dirname, '../src/components/companion/LiveCompanionDashboard.tsx');
  const pagePath = path.resolve(__dirname, '../src/app/projects/[id]/runs/[runId]/page.tsx');

  assert.ok(fs.existsSync(dashboardPath), 'LiveCompanionDashboard component must exist');
  const pageSrc = fs.readFileSync(pagePath, 'utf8');

  assert.ok(pageSrc.includes('LiveCompanionDashboard'), 'page.tsx must import LiveCompanionDashboard');
  assert.ok(pageSrc.includes("activeTab === 'live-companion'"), 'page.tsx must support live-companion tab');
  assert.ok(pageSrc.includes('Live Companion & Mirror'), 'page.tsx must display Live Companion tab button');
  console.log('  ✔ Live companion UI and page integration verified');

  // --------------------------------------------------------------------------
  // Test 9: Documentation Coverage (Contribution 130)
  // --------------------------------------------------------------------------
  console.log('▶ Test 9: Verifying Real-Time Interactive Companion documentation...');
  const docsPath = path.resolve(__dirname, '../docs/REALTIME_INTERACTIVE_COMPANION.md');
  assert.ok(fs.existsSync(docsPath), 'docs/REALTIME_INTERACTIVE_COMPANION.md must exist');

  const docsContent = fs.readFileSync(docsPath, 'utf8');
  assert.ok(docsContent.includes('Real-Time Interactive Companion'), 'Docs must have proper title');
  assert.ok(docsContent.includes('Server-Sent Events'), 'Docs must cover SSE streaming');
  assert.ok(docsContent.includes('Step Controller'), 'Docs must cover execution barrier and breakpoints');
  console.log('  ✔ Companion documentation verified');

  console.log('\n================================================================');
  console.log(' 🎉 ALL 9/9 LIVE COMPANION CI CHECKS PASSED SUCCESSFULLY!       ');
  console.log(' Point 3 / Contributions 121–130 100% Verified                  ');
  console.log('================================================================');
}

runMasterLiveCompanionSuite().catch((err) => {
  console.error('\n❌ Live Companion CI Suite failed:', err);
  process.exit(1);
});
