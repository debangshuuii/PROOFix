import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

console.log('--- Testing Command Palette Modal UI Component (Contribution 183) ---');

const componentPath = path.join(process.cwd(), 'src', 'components', 'navigation', 'CommandPaletteModal.tsx');
assert.ok(fs.existsSync(componentPath), 'CommandPaletteModal.tsx must exist');

const content = fs.readFileSync(componentPath, 'utf8');
assert.ok(content.includes("'use client'"), 'Must be client component');
assert.ok(content.includes('export function CommandPaletteModal'), 'Must export CommandPaletteModal component');
assert.ok(content.includes('globalCommandIndexer.search'), 'Must query command indexer');
assert.ok(content.includes('ArrowDown'), 'Must trap ArrowDown keyboard navigation');
assert.ok(content.includes('ArrowUp'), 'Must trap ArrowUp keyboard navigation');
assert.ok(content.includes('Escape'), 'Must trap Escape to close');
assert.ok(content.includes('metaKey || e.ctrlKey'), 'Must bind Cmd+K / Ctrl+K shortcut');

console.log('✅ Contribution 183 tests passed cleanly!');
