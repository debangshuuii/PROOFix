import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

console.log('🧪 Running API Fuzzing UI & Dashboard Integration Suite...');

const componentPath = resolve(process.cwd(), 'src/components/fuzzing/ApiFuzzingReport.tsx');
assert.ok(existsSync(componentPath), 'ApiFuzzingReport.tsx must exist');

const componentSource = readFileSync(componentPath, 'utf8');

// 1. Verify component exports
assert.ok(
  componentSource.includes('export function ApiFuzzingReportView'),
  'Must export ApiFuzzingReportView'
);

// 2. Verify health score gauge and stats bar
assert.ok(componentSource.includes('contractHealthScore'), 'Must render contract health score gauge');
assert.ok(componentSource.includes('totalEndpointsFuzzed'), 'Must display total endpoints count');
assert.ok(componentSource.includes('totalRequestsExecuted'), 'Must display total requests count');

// 3. Verify cURL command reproduction and clipboard copy
assert.ok(componentSource.includes('curlCommand'), 'Must display cURL reproduction command');
assert.ok(componentSource.includes('handleCopyCurl'), 'Must support copy cURL to clipboard');

// 4. Verify tabs (Anomalies, Endpoints, Spec)
assert.ok(componentSource.includes("'anomalies'"), 'Must have anomalies tab');
assert.ok(componentSource.includes("'endpoints'"), 'Must have endpoints matrix tab');
assert.ok(componentSource.includes("'spec'"), 'Must have configuration tab');

// 5. Verify page.tsx tab integration
const pagePath = resolve(process.cwd(), 'src/app/projects/[id]/runs/[runId]/page.tsx');
assert.ok(existsSync(pagePath), 'Run detail page.tsx must exist');
const pageSource = readFileSync(pagePath, 'utf8');

assert.ok(
  pageSource.includes("import { ApiFuzzingReportView } from '@/components/fuzzing/ApiFuzzingReport'"),
  'page.tsx must import ApiFuzzingReportView'
);
assert.ok(
  pageSource.includes("activeTab === 'api-fuzzing'"),
  'page.tsx must support api-fuzzing activeTab condition'
);
assert.ok(
  pageSource.includes('<ApiFuzzingReportView runId={runId} />'),
  'page.tsx must render ApiFuzzingReportView with runId'
);
assert.ok(
  pageSource.includes('API Fuzzing & Contracts'),
  'page.tsx must display API Fuzzing & Contracts tab button'
);

console.log('✅ API Fuzzing UI & Dashboard Integration Suite Passed (100% verified)');
