import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Landing page imports and embeds PlaygroundSection component', () => {
  const pagePath = path.resolve(process.cwd(), 'src/app/page.tsx');
  assert.ok(fs.existsSync(pagePath), 'src/app/page.tsx must exist');

  const content = fs.readFileSync(pagePath, 'utf-8');
  assert.ok(content.includes('import { PlaygroundSection } from \'@/components/playground/PlaygroundSection\''));
  assert.ok(content.includes('<PlaygroundSection id="playground" />'));
});

test('Landing page hero section includes quick jump CTA to playground', () => {
  const pagePath = path.resolve(process.cwd(), 'src/app/page.tsx');
  const content = fs.readFileSync(pagePath, 'utf-8');

  assert.ok(content.includes('href="#playground"'));
  assert.ok(content.includes('10s Interactive Sandbox'));
});
