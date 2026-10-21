import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Subsystem imports
import { CommandIndexer } from '../src/lib/navigation/command-indexer.ts';
import { QuickSwitcherProvider } from '../src/lib/navigation/quick-switcher.ts';
import { PLATFORM_SHORTCUTS } from '../src/lib/navigation/shortcut-registry.ts';
import { RecentVisitsStore } from '../src/lib/navigation/recent-visits-store.ts';
import { ENTERPRISE_PORTAL_METADATA } from '../src/lib/navigation/portal-registry.ts';

console.log('========================================================================');
console.log('🚀 PROOFix Master CI Suite: Unified Enterprise Navigation Hub (181–190)');
console.log('========================================================================\n');

// Step 1: Command Indexer Fuzzy & Acronym Matching
console.log('Step 1: Testing Command Indexer & Fuzzy Matching...');
const indexer = new CommandIndexer();
const sbxMatches = indexer.search('sandbox');
assert.ok(sbxMatches.length >= 1);
assert.equal(sbxMatches[0].id, 'nav-sandbox');

const dlqMatches = indexer.search('dlq');
assert.ok(dlqMatches.length >= 1);
assert.ok(dlqMatches.some((a) => a.id === 'act-redrive-dlq'));
console.log('  -> Fuzzy keyword search and acronym matching confirmed.\n');

// Step 2: Quick-Switcher Deep Link Synthesis
console.log('Step 2: Testing Canonical Deep Link Resolution...');
const switcher = new QuickSwitcherProvider();
const deepRun = switcher.resolveDeepLink({ resourceType: 'test_run', resourceId: 'run-99', projectId: 'p1' });
assert.equal(deepRun, '/projects/p1/runs/run-99');

const deepSbx = switcher.resolveDeepLink({ resourceType: 'sandbox', resourceId: 'sbx-101' });
assert.equal(deepSbx, '/sandbox?focus=sbx-101');

const dynamicSbxActions = switcher.generateSandboxActions(['sbx-101']);
assert.equal(dynamicSbxActions.length, 1);
console.log('  -> Canonical deep links and dynamic switch actions validated.\n');

// Step 3: Platform Shortcut Registry
console.log('Step 3: Testing Platform Shortcut Registry...');
assert.ok(PLATFORM_SHORTCUTS.length >= 10);
assert.ok(PLATFORM_SHORTCUTS.some((s) => s.key.includes('Cmd')));
assert.ok(PLATFORM_SHORTCUTS.some((s) => s.key.includes('?')));
console.log('  -> Global shortcut registry verified.\n');

// Step 4: User Favorites & Recent Visits Store
console.log('Step 4: Testing Recent Visits & Favorites Store...');
const store = new RecentVisitsStore(5);
store.recordVisit({ id: 'nav-sandbox', title: 'Sandbox', href: '/sandbox', iconName: 'Shield', category: 'enterprise' });
store.toggleFavorite('nav-sandbox');
assert.equal(store.isFavorite('nav-sandbox'), true);
const recentActions = store.generateRecentActions();
assert.equal(recentActions.length, 1);
assert.equal(recentActions[0].badge, '★ Starred');
console.log('  -> Chronological visit tracking and favorites starred.\n');

// Step 5: Enterprise Portal Hub Metadata
console.log('Step 5: Testing Enterprise Portal 8-System Coverage...');
assert.equal(ENTERPRISE_PORTAL_METADATA.length, 8);
const portals = ENTERPRISE_PORTAL_METADATA.map((p) => p.href);
assert.ok(portals.includes('/sandbox'));
assert.ok(portals.includes('/queue'));
assert.ok(portals.includes('/governance'));
console.log('  -> Complete 8-system enterprise coverage verified.\n');

// Step 6: Verify Key UI Files Exist
console.log('Step 6: Verifying Key UI Components & Route Files...');
assert.ok(fs.existsSync(path.join(process.cwd(), 'src/components/navigation/CommandPaletteModal.tsx')));
assert.ok(fs.existsSync(path.join(process.cwd(), 'src/components/navigation/ShortcutCheatSheet.tsx')));
assert.ok(fs.existsSync(path.join(process.cwd(), 'src/components/navigation/ModuleBreadcrumb.tsx')));
assert.ok(fs.existsSync(path.join(process.cwd(), 'src/components/navigation/EnterprisePortalHub.tsx')));
assert.ok(fs.existsSync(path.join(process.cwd(), 'src/app/hub/page.tsx')));
console.log('  -> UI component and page file integrity verified.\n');

console.log('========================================================================');
console.log('🎉 ALL 10 UNIFIED NAVIGATION VERIFICATION CHECKS PASSED!');
console.log('========================================================================');
