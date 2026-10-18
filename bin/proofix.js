#!/usr/bin/env node

/**
 * PROOFix CLI — Verification & Testing Automation
 * Usage:
 *   npx proofix analyze [dir]
 *   npx proofix status
 *   npx proofix verify [dir]
 */

const fs = require('fs');
const path = require('path');
const http = require('http');

const args = process.argv.slice(2);
const command = args[0] || 'help';

const BANNER = `
\x1b[36m╔════════════════════════════════════════════════════════════╗
║                   PROOFix Verification CLI                 ║
║       "Don't just generate code. Prove that it works."     ║
╚════════════════════════════════════════════════════════════╝\x1b[0m
`;

function showHelp() {
  console.log(BANNER);
  console.log(`Commands:
  \x1b[32manalyze [dir]\x1b[0m     Inspect repository structure, framework, and routes
  \x1b[32mstatus\x1b[0m            Check health of the running PROOFix verification engine
  \x1b[32mverify [dir]\x1b[0m      Conduct static verification & route pre-flight checks
  \x1b[32mhelp\x1b[0m              Display this help message

Options:
  --port <port>     Target server port (default: 3000 or 3001)
  --json            Output results as formatted JSON
`);
}

function analyzeDirectory(targetDir) {
  const resolved = path.resolve(process.cwd(), targetDir || '.');
  console.log(`\x1b[34m[INFO]\x1b[0m Scanning repository at: ${resolved}`);

  if (!fs.existsSync(resolved)) {
    console.error(`\x1b[31m[ERROR]\x1b[0m Directory not found: ${resolved}`);
    process.exit(1);
  }

  const pkgPath = path.join(resolved, 'package.json');
  let pkg = {};
  if (fs.existsSync(pkgPath)) {
    try {
      pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    } catch {}
  }

  let framework = 'Static / Unknown';
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };

  if (deps['next']) framework = `Next.js (${deps['next']})`;
  else if (deps['react-scripts']) framework = 'Create React App';
  else if (deps['vite']) framework = 'Vite';
  else if (deps['vue']) framework = 'Vue.js';
  else if (deps['@angular/core']) framework = 'Angular';
  else if (deps['express']) framework = 'Express.js';

  console.log(`\n\x1b[32m✓ Framework Detected:\x1b[0m ${framework}`);
  console.log(`\x1b[32m✓ Package Manager:\x1b[0m    ${fs.existsSync(path.join(resolved, 'package-lock.json')) ? 'npm' : fs.existsSync(path.join(resolved, 'yarn.lock')) ? 'yarn' : fs.existsSync(path.join(resolved, 'pnpm-lock.yaml')) ? 'pnpm' : 'npm'}`);
  console.log(`\x1b[32m✓ Scripts Found:\x1b[0m      ${Object.keys(pkg.scripts || {}).join(', ') || 'None'}`);

  // Discovered routes scan
  const routes = [];
  const appDir = path.join(resolved, 'src', 'app');
  const pagesDir = path.join(resolved, 'pages');

  function scanDir(dir, baseRoute = '') {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      if (ent.isDirectory()) {
        const seg = ent.name.startsWith('(') && ent.name.endsWith(')') ? '' : '/' + ent.name;
        scanDir(path.join(dir, ent.name), baseRoute + seg);
      } else if (ent.isFile()) {
        if (ent.name === 'page.tsx' || ent.name === 'page.js' || ent.name === 'page.jsx') {
          routes.push({ path: baseRoute || '/', type: 'page' });
        } else if (ent.name === 'route.ts' || ent.name === 'route.js') {
          routes.push({ path: baseRoute || '/api', type: 'api' });
        }
      }
    }
  }

  scanDir(appDir);
  scanDir(pagesDir);

  console.log(`\n\x1b[33m--- Discovered Routes (${routes.length}) ---\x1b[0m`);
  for (const r of routes) {
    console.log(`  [${r.type.toUpperCase().padEnd(4)}] ${r.path}`);
  }

  console.log(`\n\x1b[36mVerification Pre-flight Complete.\x1b[0m Ready for Playwright testbed execution.`);
}

async function checkStatus() {
  const ports = [3000, 3001];
  let found = false;

  for (const port of ports) {
    try {
      const ok = await new Promise((resolve) => {
        const req = http.get(`http://localhost:${port}/api/v1/health`, { timeout: 2000 }, (res) => {
          let data = '';
          res.on('data', (d) => (data += d));
          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              console.log(`\x1b[32m✓ PROOFix Engine active on port ${port}!\x1b[0m`);
              console.log(`  Version:      ${json.version}`);
              console.log(`  Tagline:      ${json.tagline}`);
              console.log(`  Capabilities: ${JSON.stringify(json.capabilities)}`);
              resolve(true);
            } catch {
              resolve(false);
            }
          });
        });
        req.on('error', () => resolve(false));
      });

      if (ok) {
        found = true;
        break;
      }
    } catch {}
  }

  if (!found) {
    console.log(`\x1b[33m[NOTICE]\x1b[0m No active PROOFix server detected on ports 3000 or 3001.`);
    console.log(`Start the server with: \x1b[32mnpm run dev\x1b[0m or \x1b[32mnpx next start -p 3001\x1b[0m`);
  }
}

switch (command) {
  case 'analyze':
  case 'verify':
    analyzeDirectory(args[1]);
    break;
  case 'status':
    checkStatus();
    break;
  case 'help':
  default:
    showHelp();
    break;
}
