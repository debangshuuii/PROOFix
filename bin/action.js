#!/usr/bin/env node

/**
 * Entry point for GitHub Action runner invocation.
 */
const { runAction } = require('../src/action/index.ts');

runAction().then(({ exitCode }) => {
  process.exit(exitCode);
}).catch((err) => {
  console.error('[PROOFix Action Fatal Abort]', err);
  process.exit(2);
});
