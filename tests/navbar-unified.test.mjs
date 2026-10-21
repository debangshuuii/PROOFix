import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

console.log('--- Testing Unified Enterprise Navbar Component (Contribution 184) ---');

const navbarPath = path.join(process.cwd(), 'src', 'components', 'Navbar.tsx');
assert.ok(fs.existsSync(navbarPath), 'Navbar.tsx must exist');

const content = fs.readFileSync(navbarPath, 'utf8');
assert.ok(content.includes("'use client'"), 'Navbar must be client component');
assert.ok(content.includes('/sandbox'), 'Navbar must link to /sandbox');
assert.ok(content.includes('/queue'), 'Navbar must link to /queue');
assert.ok(content.includes('/governance'), 'Navbar must link to /governance');
assert.ok(content.includes('CommandPaletteModal'), 'Navbar must render CommandPaletteModal');
assert.ok(content.includes('setPaletteOpen(true)'), 'Navbar must toggle command palette open');

console.log('✅ Contribution 184 tests passed cleanly!');
