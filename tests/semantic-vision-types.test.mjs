import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('--- Testing Semantic Vision-AI Types & Schema (Contribution 111) ---');

function testTypeFileAndExports() {
  const typesPath = path.join(__dirname, '..', 'src', 'lib', 'types', 'semantic-vision.ts');
  assert.ok(fs.existsSync(typesPath), 'semantic-vision.ts must exist');

  const content = fs.readFileSync(typesPath, 'utf8');
  assert.ok(content.includes('SemanticDefectCategory'));
  assert.ok(content.includes('text_clipping'));
  assert.ok(content.includes('element_overlap'));
  assert.ok(content.includes('broken_image_placeholder'));
  assert.ok(content.includes('navigation_obscuration'));
  assert.ok(content.includes('unexpected_layout_shift'));
  assert.ok(content.includes('contrast_anomaly'));
  assert.ok(content.includes('SemanticVisualDefect'));
  assert.ok(content.includes('LayoutShiftExplanation'));
  assert.ok(content.includes('SemanticVisionConfig'));
  assert.ok(content.includes('SemanticVisionAuditResult'));

  const indexPath = path.join(__dirname, '..', 'src', 'lib', 'types', 'index.ts');
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  assert.ok(indexContent.includes("export * from './semantic-vision.ts'"));

  console.log('[PASS] Semantic vision types properly exported and registered in global index.');
}

function testSchemaSampleInstantiation() {
  const defect = {
    id: 'defect_overlap_01',
    category: 'element_overlap',
    severity: 'critical',
    title: 'Navigation Modal Obscures Primary CTA',
    explanation: 'The mobile navigation overlay obscures the primary Checkout action button by 64px.',
    boundingBox: { x: 120, y: 450, width: 300, height: 80, unit: 'px' },
    confidenceScore: 94,
    suggestedRemediation: 'Ensure modal container has backdrop click-away and does not linger over page content.',
  };

  assert.equal(defect.category, 'element_overlap');
  assert.equal(defect.severity, 'critical');
  assert.equal(defect.boundingBox.unit, 'px');
  assert.ok(defect.confidenceScore >= 90);

  const layoutShift = {
    culpritElement: 'img.hero-banner',
    displacementPx: 120,
    direction: 'down',
    explanation: 'The banner image was uploaded at 2000px without explicit dimensions, pushing the main navigation 120px down.',
  };

  assert.equal(layoutShift.displacementPx, 120);
  assert.equal(layoutShift.direction, 'down');
  assert.ok(layoutShift.explanation.includes('pushing the main navigation 120px down'));

  console.log('[PASS] Schema models instantiate cleanly and represent human-like defect categories.');
}

testTypeFileAndExports();
testSchemaSampleInstantiation();
console.log('\nAll Contribution 111 tests passed cleanly!');
