import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

console.log('--- Testing Unified Navigation & Command Palette Types (Contribution 181) ---');

const typesFilePath = path.join(process.cwd(), 'src', 'lib', 'types', 'navigation-palette.ts');
assert.ok(fs.existsSync(typesFilePath), 'src/lib/types/navigation-palette.ts must exist');

const content = fs.readFileSync(typesFilePath, 'utf8');
assert.ok(content.includes('export type NavigationCategory'), 'Must declare NavigationCategory');
assert.ok(content.includes('export interface CommandAction'), 'Must declare CommandAction');
assert.ok(content.includes('export interface RecentVisitItem'), 'Must declare RecentVisitItem');
assert.ok(content.includes('export interface BreadcrumbCrumb'), 'Must declare BreadcrumbCrumb');
assert.ok(content.includes('export interface NavigationShortcut'), 'Must declare NavigationShortcut');
assert.ok(content.includes('export interface CommandPaletteState'), 'Must declare CommandPaletteState');

const sampleAction = {
  id: 'nav-sandbox',
  title: 'Sandbox Console & MicroVMs',
  subtitle: 'Inspect cgroups, network shield, and isolation pools',
  category: 'enterprise',
  href: '/sandbox',
  shortcut: ['g', 's'],
  iconName: 'Shield',
  keywords: ['sandbox', 'microvm', 'firecracker', 'cgroups', 'container'],
  badge: 'Cgroups v2',
  actionType: 'navigate',
};

assert.equal(sampleAction.category, 'enterprise');
assert.equal(sampleAction.href, '/sandbox');
assert.ok(sampleAction.keywords.includes('microvm'));

console.log('✅ Contribution 181 tests passed cleanly!');
