import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('RealtimeCompanionMirror UI component exists and renders WebRTC & interactive elements', () => {
  const filePath = path.join(process.cwd(), 'src/components/companion/RealtimeCompanionMirror.tsx');
  assert.ok(fs.existsSync(filePath), 'Component file must exist');

  const content = fs.readFileSync(filePath, 'utf8');
  assert.ok(content.includes('Ultra-Low Latency Live Companion Mirroring'));
  assert.ok(content.includes('WebRTC (<30ms)'));
  assert.ok(content.includes('WebSocket (<60ms)'));
  assert.ok(content.includes('SSE Fallback'));
  assert.ok(content.includes('60 FPS'));
  assert.ok(content.includes('Step Over (F10)'));
  assert.ok(content.includes('Pause (F8)'));
});
