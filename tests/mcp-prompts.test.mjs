import assert from 'node:assert';
import { McpPromptRegistry } from '../src/lib/mcp/prompt-registry.ts';
import { registerDefaultPrompts } from '../src/lib/mcp/prompts/index.ts';

console.log('[TEST] MCP Prompts');
const reg = new McpPromptRegistry();
registerDefaultPrompts(reg);

const prompts = reg.listPrompts();
assert.strictEqual(prompts.length, 2);

const msgs = await reg.getPrompt('verify_and_repair', { targetRoute: '/checkout' });
assert(msgs[0].content.text.includes('/checkout'));
console.log('✓ MCP Prompts verified.');
