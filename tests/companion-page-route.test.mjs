import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { ENTERPRISE_PORTAL_METADATA } from '../src/lib/navigation/portal-registry.ts';

test('Companion mirror page route exists and links RealtimeCompanionMirror', () => {
  const p = path.join(process.cwd(), 'src/app/companion/mirror/page.tsx');
  assert.ok(fs.existsSync(p));

  const content = fs.readFileSync(p, 'utf8');
  assert.ok(content.includes('RealtimeCompanionMirror'));
  assert.ok(content.includes('Live Companion Mirror'));
});

test('Portal registry points companion directly to /companion/mirror', () => {
  const companion = ENTERPRISE_PORTAL_METADATA.find((m) => m.id === 'portal-companion');
  assert.ok(companion);
  assert.equal(companion.href, '/companion/mirror');
  assert.equal(companion.badge, 'WebRTC 60 FPS');
});
