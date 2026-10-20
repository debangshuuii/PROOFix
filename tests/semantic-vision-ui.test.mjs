import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('--- Testing Semantic Vision-AI UI Component & Run Page Integration (Contribution 119) ---');

function testComponentFileAndExports() {
  const compPath = path.join(__dirname, '..', 'src', 'components', 'vision', 'SemanticVisionReport.tsx');
  assert.ok(fs.existsSync(compPath), 'SemanticVisionReport.tsx must exist');

  const content = fs.readFileSync(compPath, 'utf8');
  assert.ok(content.includes('export function SemanticVisionReport'));
  assert.ok(content.includes('SemanticVisionReportProps'));
  assert.ok(content.includes('Annotated Defect Map'));
  assert.ok(content.includes('Golden Master'));
  assert.ok(content.includes('Candidate Run'));
  assert.ok(content.includes('Layout Shift Root Causes'));
  assert.ok(content.includes('AI Suggested Remediation'));
  console.log('[PASS] SemanticVisionReport component exports and core visual sections verified.');
}

function testRunPageIntegration() {
  const pagePath = path.join(__dirname, '..', 'src', 'app', 'projects', '[id]', 'runs', '[runId]', 'page.tsx');
  assert.ok(fs.existsSync(pagePath), 'Run page.tsx must exist');

  const content = fs.readFileSync(pagePath, 'utf8');
  assert.ok(
    content.includes("import { SemanticVisionReport } from '@/components/vision/SemanticVisionReport'"),
    'Run page must import SemanticVisionReport'
  );
  assert.ok(
    content.includes("'semantic-vision'"),
    'activeTab state union must include semantic-vision'
  );
  assert.ok(
    content.includes("setActiveTab('semantic-vision')"),
    'Run page must contain a tab button switching to semantic-vision'
  );
  assert.ok(
    content.includes("<SemanticVisionReport />"),
    'Run page must render SemanticVisionReport when activeTab is semantic-vision'
  );
  console.log('[PASS] Verification Run page integrates SemanticVisionReport into tab navigation.');
}

testComponentFileAndExports();
testRunPageIntegration();
console.log('\nAll Contribution 119 tests passed cleanly!');
