import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('ChaosMonkeyVisualizer component exists and renders state graph elements', () => {
  const filePath = path.join(process.cwd(), 'src/components/crawler/ChaosMonkeyVisualizer.tsx');
  assert.ok(fs.existsSync(filePath), 'Component file must exist');

  const content = fs.readFileSync(filePath, 'utf8');
  assert.ok(content.includes('Autonomous Exploratory "Chaos Monkey" AI Crawler'));
  assert.ok(content.includes('Launch Autonomous Chaos Sweep'));
  assert.ok(content.includes('Application UI State Graph G = (V, E)'));
  assert.ok(content.includes('Autonomous Zero-Day & Exception Detections'));
});

test('Crawler page route exists and sets metadata', () => {
  const pagePath = path.join(process.cwd(), 'src/app/crawler/page.tsx');
  assert.ok(fs.existsSync(pagePath), 'Page route file must exist');

  const content = fs.readFileSync(pagePath, 'utf8');
  assert.ok(content.includes('ChaosMonkeyVisualizer'));
  assert.ok(content.includes('Autonomous Chaos Monkey Crawler'));
});
