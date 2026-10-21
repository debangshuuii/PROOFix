/**
 * PROOFix Master Live Companion Real-Time Transport CI Suite (Contribution 240)
 *
 * Validates:
 * 1. WebRTC & WebSocket transport protocol schemas and latency contracts (<50ms, 60 FPS)
 * 2. WebSocket bidirectional signaling and control session manager
 * 3. WebRTC peer connection, SDP offer/answer, and trickle ICE signaling broker
 * 4. 60 FPS viewport video frame streamer with delta deduplication
 * 5. Ultra-low latency (<50ms) bidirectional step-debugger controller
 * 6. Adaptive protocol fallback router (WebRTC -> WebSocket -> SSE)
 * 7. Live companion streaming and WebRTC signaling REST route handlers
 * 8. Real-time companion mirroring canvas UI component
 * 9. Live companion page route and enterprise portal navigation integration
 */

import { execSync } from 'node:child_process';
import assert from 'node:assert/strict';

console.log('🚀 Running PROOFix Live Companion Real-Time Transport CI Suite...\n');

const testSuites = [
  'tests/live-transport-types.test.mjs',
  'tests/websocket-session-manager.test.mjs',
  'tests/webrtc-signaling-broker.test.mjs',
  'tests/viewport-frame-streamer.test.mjs',
  'tests/step-debugger-controller.test.mjs',
  'tests/adaptive-transport-router.test.mjs',
  'tests/companion-transport-routes.test.mjs',
  'tests/companion-mirror-ui.test.mjs',
  'tests/companion-page-route.test.mjs',
];

let totalPassed = 0;
let totalFailed = 0;

for (const suite of testSuites) {
  process.stdout.write(`  ⏳ Running ${suite}... `);
  try {
    execSync(`node ${suite}`, { stdio: 'pipe' });
    console.log('✅ PASS');
    totalPassed++;
  } catch (err) {
    console.log('❌ FAIL');
    console.error(err.stdout ? err.stdout.toString() : err.message);
    totalFailed++;
  }
}

console.log('\n---------------------------------------------------------');
console.log(`📊 Live Transport Verification Results: ${totalPassed} passed, ${totalFailed} failed`);
console.log('---------------------------------------------------------\n');

if (totalFailed > 0) {
  process.exit(1);
} else {
  console.log('✨ All Live Companion Real-Time Transport verification gates PASSED successfully!\n');
}
