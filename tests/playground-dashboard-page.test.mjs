import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Dashboard page imports PlaygroundScenarioSelector and PlaygroundBadge', () => {
  const dashPath = path.resolve(process.cwd(), 'src/app/dashboard/page.tsx');
  assert.ok(fs.existsSync(dashPath), 'src/app/dashboard/page.tsx must exist');

  const content = fs.readFileSync(dashPath, 'utf-8');
  assert.ok(content.includes('import { PlaygroundScenarioSelector } from \'@/components/playground/PlaygroundScenarioSelector\''));
  assert.ok(content.includes('import { PlaygroundBadge } from \'@/components/playground/PlaygroundBadge\''));
});

test('Dashboard page embeds One-Click Interactive Demo Scenarios card container', () => {
  const dashPath = path.resolve(process.cwd(), 'src/app/dashboard/page.tsx');
  const content = fs.readFileSync(dashPath, 'utf-8');

  assert.ok(content.includes('One-Click Interactive Demo Scenarios'));
  assert.ok(content.includes('<PlaygroundScenarioSelector />'));
  assert.ok(content.includes('Zero Configuration Required'));
});
