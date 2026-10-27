import assert from 'node:assert/strict';
import {
  isRouteFile,
  isApiRoute,
  isAppRoute,
  normalizeRouteFromPath,
  extractDynamicParams,
  findRouteExportLine,
} from '../extensions/vscode-proofix/src/route-detector.ts';

console.log('Testing VS Code Route Detector & Normalizer...');

// Test 1: App Router detection
assert.equal(isRouteFile('src/app/page.tsx'), true);
assert.equal(isRouteFile('src/app/dashboard/page.tsx'), true);
assert.equal(isRouteFile('src/app/api/v1/health/route.ts'), true);
assert.equal(isRouteFile('src/components/Button.tsx'), false);
assert.equal(isRouteFile('src/lib/utils.ts'), false);

// Test 2: API Route detection
assert.equal(isApiRoute('src/app/api/checkout/route.ts'), true);
assert.equal(isApiRoute('src/pages/api/data.ts'), true);
assert.equal(isApiRoute('src/app/dashboard/page.tsx'), false);

// Test 3: Path normalization
assert.equal(normalizeRouteFromPath('d:/Coding/PROOFix/src/app/page.tsx'), '/');
assert.equal(normalizeRouteFromPath('d:/Coding/PROOFix/src/app/dashboard/page.tsx'), '/dashboard');
assert.equal(normalizeRouteFromPath('d:/Coding/PROOFix/src/app/api/checkout/route.ts'), '/api/checkout');
assert.equal(normalizeRouteFromPath('src/app/(auth)/login/page.tsx'), '/login');

// Test 4: Dynamic parameters
const params = extractDynamicParams('/projects/[id]/runs/[runId]');
assert.deepEqual(params, ['id', 'runId']);

// Test 5: Route export line finder
const sampleCode = `
import React from 'react';

export default function DashboardPage() {
  return <div>Dashboard</div>;
}
`;
const exportResult = findRouteExportLine(sampleCode);
assert.equal(exportResult.line, 3);
assert.equal(exportResult.exportName, 'DashboardPage');

console.log('✅ VS Code Route Detector & Normalizer tests passed!');
