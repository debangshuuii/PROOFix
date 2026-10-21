import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { PLATFORM_SHORTCUTS } from '../src/lib/navigation/shortcut-registry.ts';

console.log('--- Testing Keyboard Shortcut Cheat Sheet Component (Contribution 186) ---');

const componentPath = path.join(process.cwd(), 'src', 'components', 'navigation', 'ShortcutCheatSheet.tsx');
assert.ok(fs.existsSync(componentPath), 'ShortcutCheatSheet.tsx must exist');

assert.ok(PLATFORM_SHORTCUTS.length >= 10, 'Must register at least 10 platform shortcuts');

const cmdK = PLATFORM_SHORTCUTS.find((s) => s.key.includes('Cmd'));
assert.ok(cmdK, 'Must document Cmd+K shortcut');

const sandboxNav = PLATFORM_SHORTCUTS.find((s) => s.key.includes('g then x'));
assert.ok(sandboxNav, 'Must document g x navigation shortcut to Sandbox');

const dlqAction = PLATFORM_SHORTCUTS.find((s) => s.key.includes('t then r'));
assert.ok(dlqAction, 'Must document t r shortcut to Trigger Run');

const fileContent = fs.readFileSync(componentPath, 'utf8');
assert.ok(fileContent.includes("'use client'"), 'Must be client component');
assert.ok(fileContent.includes("e.key === '?'"), 'Must trap ? key');
assert.ok(fileContent.includes("e.key === 'Escape'"), 'Must trap Escape');

console.log('✅ Contribution 186 tests passed cleanly!');
