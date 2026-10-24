#!/usr/bin/env node

/**
 * PROOFix CLI — Verification & Testing Automation
 * "Don't just generate code. Prove that it works."
 *
 * Usage:
 *   npx proofix doctor [--heal] [--json]
 *   npx proofix run [--interactive] [--scenario <id>] [--headless]
 *   npx proofix fix [--apply] [--scenario <id>] [--rollback]
 *   npx proofix watch [--debounce <ms>]
 *   npx proofix analyze [dir]
 *   npx proofix status [--port <num>]
 */

const path = require('path');

async function main() {
  const args = process.argv.slice(2);

  try {
    // Dynamic import to load TypeScript ESM module
    const { dispatch } = await import('../src/lib/cli/dispatcher.ts');
    const exitCode = await dispatch(args);
    process.exit(exitCode ?? 0);
  } catch (err) {
    console.error('\x1b[31m[PROOFix CLI FATAL ERROR]:\x1b[0m', err && err.message ? err.message : err);
    if (process.env.DEBUG || process.argv.includes('--verbose')) {
      console.error(err);
    }
    process.exit(1);
  }
}

main();
