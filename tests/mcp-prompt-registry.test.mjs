import assert from 'node:assert';
import { McpPromptRegistry } from '../src/lib/mcp/prompt-registry.ts';

console.log('[TEST] McpPromptRegistry');
const reg = new McpPromptRegistry();

reg.register({
  name: 'diagnose',
  description: 'Diagnose a defect',
  arguments: [{ name: 'file', required: true }]
}, async (args) => {
  return [{ role: 'user', content: { type: 'text', text: 'Diagnose file: ' + args.file } }];
});

assert.strictEqual(reg.listPrompts().length, 1);
const msgs = await reg.getPrompt('diagnose', { file: 'page.tsx' });
assert.strictEqual(msgs[0].content.text, 'Diagnose file: page.tsx');
console.log('✓ McpPromptRegistry unit test passed.');
