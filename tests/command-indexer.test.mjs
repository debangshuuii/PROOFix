import assert from 'node:assert/strict';
import { CommandIndexer, DEFAULT_COMMAND_ACTIONS } from '../src/lib/navigation/command-indexer.ts';

console.log('--- Testing Command Palette Search Index & Fuzzy Matcher (Contribution 182) ---');

const indexer = new CommandIndexer();

// 1. Initial Actions Count
const allActions = indexer.getAllActions();
assert.ok(allActions.length >= 9, 'Should index default platform actions');
assert.equal(indexer.search('').length, allActions.length);
console.log('✅ Default actions registered in search index');

// 2. Keyword Fuzzy Search
const sandboxResults = indexer.search('sandbox');
assert.ok(sandboxResults.length >= 1);
assert.equal(sandboxResults[0].id, 'nav-sandbox');
assert.equal(sandboxResults[0].category, 'enterprise');
console.log('✅ Exact and keyword fuzzy match resolved: "sandbox" -> nav-sandbox');

// 3. Acronym Match (dlq -> Dead-Letter Queue)
const dlqResults = indexer.search('dlq');
assert.ok(dlqResults.length >= 1);
assert.ok(dlqResults.some((a) => a.id === 'act-redrive-dlq' || a.id === 'nav-queue'));
console.log('✅ Acronym matching resolved: "dlq" -> Dead-Letter Queue actions');

// 4. Category Filtering
const securityActions = indexer.search('', 'security');
assert.ok(securityActions.length >= 2);
assert.ok(securityActions.every((a) => a.category === 'security'));
console.log('✅ Category filtering restricted results strictly to category');

// 5. Dynamic Action Registration
indexer.registerAction({
  id: 'dynamic-test-action',
  title: 'Custom Chaos Probe',
  category: 'operations',
  iconName: 'Flame',
  keywords: ['chaos', 'custom'],
  actionType: 'execute',
});

const customResult = indexer.search('chaos');
assert.equal(customResult.length, 1);
assert.equal(customResult[0].id, 'dynamic-test-action');
console.log('✅ Dynamic action registered and discovered via search');

console.log('✅ Contribution 182 tests passed cleanly!');
