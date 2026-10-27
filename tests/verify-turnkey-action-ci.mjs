import { execSync } from 'child_process';

console.log('════════════════════════════════════════════════════════════════════════');
console.log('🚀 PROOFix CI: Turnkey GitHub Action & Sticky PR Bot Verification Suite');
console.log('════════════════════════════════════════════════════════════════════════\n');

const testSuites = [
  'tests/action-hydration-detector.test.mjs',
  'tests/action-broken-routes.test.mjs',
  'tests/action-sticky-marker.test.mjs',
  'tests/action-visual-slider.test.mjs',
  'tests/action-visual-diff-formatter.test.mjs',
  'tests/action-video-step-linker.test.mjs',
  'tests/action-autofix-dispatch.test.mjs',
  'tests/action-check-run-hydration.test.mjs',
  'tests/action-check-run-broken-routes.test.mjs',
  'tests/action-check-run-annotations.test.mjs',
  'tests/action-turnkey-hydration-exit.test.mjs',
  'tests/action-turnkey-broken-route-exit.test.mjs',
  'tests/action-sticky-comment-builder.test.mjs',
  'tests/action-zero-auth-proof-preview.test.mjs',
];

let passed = 0;
let failed = 0;

for (const suite of testSuites) {
  process.stdout.write(`• Running ${suite.padEnd(52)} `);
  try {
    execSync(`npx tsx ${suite}`, { stdio: 'pipe' });
    console.log('✅ PASSED');
    passed++;
  } catch (err) {
    console.log('❌ FAILED');
    if (err.stdout) console.log(err.stdout.toString());
    if (err.stderr) console.error(err.stderr.toString());
    failed++;
  }
}

console.log('\n════════════════════════════════════════════════════════════════════════');
console.log(`Results: ${passed}/${testSuites.length} test suites passed cleanly.`);
if (failed > 0) {
  console.error(`🚨 ${failed} test suite(s) failed.`);
  process.exit(1);
} else {
  console.log('🛡️ Turnkey GitHub Action & Sticky PR Bot verification 100% SUCCESS.');
  process.exit(0);
}
