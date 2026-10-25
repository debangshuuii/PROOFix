import assert from 'node:assert';
import { ClaudeDesktopConfigGenerator } from '../src/lib/mcp/config-generator.ts';

console.log('[TEST] ClaudeDesktopConfigGenerator');
const config = ClaudeDesktopConfigGenerator.generate();
assert(config.mcpServers.proofix);
assert.strictEqual(config.mcpServers.proofix.args[0], 'bin/proofix-mcp.js');

const cursor = ClaudeDesktopConfigGenerator.generateCursorSnippet();
assert(cursor.includes('proofix-mcp.js'));
console.log('✓ ClaudeDesktopConfigGenerator test passed.');
