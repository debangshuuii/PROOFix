import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

console.log('--- Testing Module Breadcrumb & Contextual Action Bar Component (Contribution 187) ---');

const componentPath = path.join(process.cwd(), 'src', 'components', 'navigation', 'ModuleBreadcrumb.tsx');
assert.ok(fs.existsSync(componentPath), 'ModuleBreadcrumb.tsx must exist');

const content = fs.readFileSync(componentPath, 'utf8');
assert.ok(content.includes("'use client'"), 'Must be client component');
assert.ok(content.includes('export function ModuleBreadcrumb'), 'Must export ModuleBreadcrumb component');
assert.ok(content.includes('crumbs.map'), 'Must render breadcrumb crumbs');
assert.ok(content.includes('handleCopyLink'), 'Must include copy link handler');
assert.ok(content.includes('aria-label="Breadcrumb"'), 'Must have accessible breadcrumb navigation');

console.log('✅ Contribution 187 tests passed cleanly!');
