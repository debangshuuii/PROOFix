import assert from 'node:assert/strict';
import { RouteCodeLensProvider } from '../extensions/vscode-proofix/src/codelens-provider.ts';

console.log('Testing Route CodeLens Provider...');

const provider = new RouteCodeLensProvider();

const route = {
  routePath: '/dashboard',
  filePath: 'src/app/dashboard/page.tsx',
  line: 12,
  isApi: false,
  isDynamic: false,
};

// Test 1: Untested route lenses
const untestedLenses = provider.provideCodeLenses(route);
assert.equal(untestedLenses.length, 3, 'Should provide 3 CodeLenses');
assert.ok(untestedLenses[0].command.title.includes('▶ Run Journey'));
assert.equal(untestedLenses[0].command.command, 'proofix.runRoute');
assert.ok(untestedLenses[1].command.title.includes('🛡️ Prove Route'));
assert.equal(untestedLenses[1].command.command, 'proofix.proveRoute');
assert.ok(untestedLenses[2].command.title.includes('Untested'));

// Test 2: Proven route lenses
provider.setRouteStatus('/dashboard', {
  routePath: '/dashboard',
  status: 'proven',
  passedJourneys: 4,
  totalJourneys: 4,
  durationMs: 950,
  lastVerified: 'Now',
});

const provenLenses = provider.provideCodeLenses(route);
assert.ok(provenLenses[2].command.title.includes('✅ Proven (4/4)'));

// Test 3: Failing route lenses
provider.setRouteStatus('/dashboard', {
  routePath: '/dashboard',
  status: 'failing',
  passedJourneys: 3,
  totalJourneys: 4,
  durationMs: 1200,
  lastVerified: 'Now',
});

const failingLenses = provider.provideCodeLenses(route);
assert.ok(failingLenses[2].command.title.includes('Failing'));
assert.equal(failingLenses[2].command.command, 'proofix.openFailureDiff');

console.log('✅ Route CodeLens Provider tests passed!');
