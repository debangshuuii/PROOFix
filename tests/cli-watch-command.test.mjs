import test from 'node:test';
import assert from 'node:assert/strict';
import { executeWatchCommand } from '../src/lib/cli/commands/watch.ts';
import { LocalFileWatcher } from '../src/lib/cli/watch/file-watcher.ts';

test('watch-command: initializes watcher and controller instances', async () => {
  const instance = await executeWatchCommand({ debounceMs: 100 }, true);
  assert.ok(instance);
  assert.ok(instance.watcher);
  assert.ok(instance.controller);
  assert.equal(typeof instance.stop, 'function');
});

test('file-watcher: correctly identifies ignored and source paths', () => {
  const watcher = new LocalFileWatcher();
  assert.equal(watcher.isIgnored('.git/HEAD'), true);
  assert.equal(watcher.isIgnored('node_modules/playwright/index.js'), true);
  assert.equal(watcher.isIgnored('.next/server/app/page.js'), true);
  assert.equal(watcher.isIgnored('data/proofix_db.json'), true);
  assert.equal(watcher.isIgnored('src/app/checkout/page.tsx'), false);
  assert.equal(watcher.isIgnored('tests/verify-proofix.mjs'), false);
});

test.after(() => {
  setTimeout(() => process.exit(0), 20).unref();
});
