import { execSync } from 'child_process';

console.log('════════════════════════════════════════════════════════════════════════');
console.log('💻 PROOFix CI: VS Code & Cursor Native IDE Extension Verification Suite');
console.log('════════════════════════════════════════════════════════════════════════\n');

const testSuites = [
  'tests/vscode-mock-api.test.mjs',
  'tests/vscode-route-detector.test.mjs',
  'tests/vscode-gutter-decorations.test.mjs',
  'tests/vscode-codelens-provider.test.mjs',
  'tests/vscode-test-controller.test.mjs',
  'tests/vscode-test-run-states.test.mjs',
  'tests/vscode-patch-manager-diff.test.mjs',
  'tests/vscode-patch-rollback.test.mjs',
  'tests/vscode-status-bar.test.mjs',
  'tests/vscode-webview-panel.test.mjs',
];

let passed = 0;
let failed = 0;

for (const suite of testSuites) {
  process.stdout.write(`• Running ${suite.padEnd(50)} `);
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
console.log(`Results: ${passed}/${testSuites.length} extension test suites passed cleanly.`);
if (failed > 0) {
  console.error(`🚨 ${failed} extension test suite(s) failed.`);
  process.exit(1);
} else {
  console.log('🛡️ VS Code & Cursor Native IDE Extension verification 100% SUCCESS.');
  process.exit(0);
}
