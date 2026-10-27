import assert from 'node:assert/strict';
import {
  GutterDecorationProvider,
  formatHoverMarkdown,
} from '../extensions/vscode-proofix/src/gutter-decorations.ts';
import { SVG_PROVEN_GUTTER, SVG_FAILED_GUTTER } from '../extensions/vscode-proofix/src/icons.ts';

console.log('Testing Gutter Decoration Provider...');

const provider = new GutterDecorationProvider();

// Test 1: Untested default decoration
const route = {
  routePath: '/checkout',
  filePath: 'src/app/checkout/page.tsx',
  line: 4,
  isApi: false,
  isDynamic: false,
};

const untestedDec = provider.computeDecorationsForRoute(route);
assert.ok(untestedDec);
assert.equal(untestedDec.range.startLine, 4);
assert.ok(untestedDec.hoverMessage.includes('Untested'));

// Test 2: Proven decoration
provider.setRouteStatus('/checkout', {
  routePath: '/checkout',
  status: 'proven',
  passedJourneys: 3,
  totalJourneys: 3,
  durationMs: 820,
  lastVerified: '12:00:00 PM',
  proofFingerprint: '9f8e7d6c5b4a',
});

const provenDec = provider.computeDecorationsForRoute(route);
assert.ok(provenDec);
assert.equal(provenDec.iconUri, SVG_PROVEN_GUTTER);
assert.ok(provenDec.hoverMessage.includes('Proven'));
assert.ok(provenDec.hoverMessage.includes('3/3'));

// Test 3: Failed decoration
provider.setRouteStatus('/checkout', {
  routePath: '/checkout',
  status: 'failing',
  passedJourneys: 2,
  totalJourneys: 3,
  durationMs: 1400,
  lastVerified: '12:05:00 PM',
  failureSnippet: 'HTTP 404 on /api/checkout',
});

const failedDec = provider.computeDecorationsForRoute(route);
assert.ok(failedDec);
assert.equal(failedDec.iconUri, SVG_FAILED_GUTTER);
assert.ok(failedDec.hoverMessage.includes('Failing'));
assert.ok(failedDec.hoverMessage.includes('HTTP 404 on /api/checkout'));

// Test 4: Format hover markdown helper
const hoverMd = formatHoverMarkdown({
  routePath: '/api/v1/health',
  status: 'proven',
  passedJourneys: 1,
  totalJourneys: 1,
  durationMs: 50,
  lastVerified: '12:10:00 PM',
});
assert.ok(hoverMd.includes('100%'));
assert.ok(hoverMd.includes('PROVEN'));

console.log('✅ Gutter Decoration Provider tests passed!');
