import assert from 'node:assert';
import fs from 'node:fs';

console.log('[TEST] bin/proofix-mcp.js presence');
assert(fs.existsSync('bin/proofix-mcp.js'));
const content = fs.readFileSync('bin/proofix-mcp.js', 'utf-8');
assert(content.includes('#!/usr/bin/env node'));
assert(content.includes('McpServer'));
console.log('✓ bin/proofix-mcp.js verified.');
