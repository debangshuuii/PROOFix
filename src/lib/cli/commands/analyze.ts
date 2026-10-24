/**
 * PROOFix CLI: `proofix analyze` Command Handler
 * Inspects framework, package manager, and discovered application / API routes.
 */

import fs from 'fs';
import path from 'path';
import { printBanner } from '../banner.ts';
import { colors, symbols } from '../colors.ts';
import { renderTable, createBox } from '../table.ts';

export interface RouteDiscovery {
  path: string;
  type: 'page' | 'api' | 'layout';
  file: string;
}

export interface AnalyzeResult {
  framework: string;
  packageManager: string;
  targetDir: string;
  scripts: string[];
  routes: RouteDiscovery[];
}

export function executeAnalyzeCommand(targetDir = '.', json = false): AnalyzeResult {
  const resolved = path.resolve(process.cwd(), targetDir);

  if (!json) {
    printBanner('Repository Architecture Analysis');
    console.log(`  ${colors.blue(symbols.info)} Scanning project at: ${colors.bold(resolved)}\n`);
  }

  const pkgPath = path.join(resolved, 'package.json');
  let pkg: any = {};
  if (fs.existsSync(pkgPath)) {
    try {
      pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    } catch {}
  }

  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  let framework = 'Static / Vanilla HTML';
  if (deps['next']) framework = `Next.js (${deps['next']})`;
  else if (deps['vite']) framework = `Vite (${deps['vite']})`;
  else if (deps['react-scripts']) framework = 'Create React App';
  else if (deps['vue']) framework = `Vue.js (${deps['vue']})`;
  else if (deps['express']) framework = `Express.js (${deps['express']})`;

  let packageManager = 'npm';
  if (fs.existsSync(path.join(resolved, 'pnpm-lock.yaml'))) packageManager = 'pnpm';
  else if (fs.existsSync(path.join(resolved, 'yarn.lock'))) packageManager = 'yarn';
  else if (fs.existsSync(path.join(resolved, 'bun.lockb'))) packageManager = 'bun';

  const routes: RouteDiscovery[] = [];
  const appDir = path.join(resolved, 'src', 'app');
  const pagesDir = path.join(resolved, 'pages');

  function scanDir(dir: string, baseRoute = ''): void {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
      if (ent.isDirectory()) {
        const isRouteGroup = ent.name.startsWith('(') && ent.name.endsWith(')');
        const seg = isRouteGroup ? '' : '/' + ent.name;
        scanDir(path.join(dir, ent.name), baseRoute + seg);
      } else if (ent.isFile()) {
        const fullRel = path.relative(resolved, path.join(dir, ent.name));
        if (ent.name.startsWith('page.')) {
          routes.push({ path: baseRoute || '/', type: 'page', file: fullRel });
        } else if (ent.name.startsWith('route.')) {
          routes.push({ path: baseRoute || '/api', type: 'api', file: fullRel });
        } else if (ent.name.startsWith('layout.')) {
          routes.push({ path: baseRoute || '/', type: 'layout', file: fullRel });
        }
      }
    }
  }

  scanDir(appDir);
  scanDir(pagesDir);

  const scripts = Object.keys(pkg.scripts || {});
  const result: AnalyzeResult = {
    framework,
    packageManager,
    targetDir: resolved,
    scripts,
    routes,
  };

  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return result;
  }

  // Box for project info
  const infoLines = [
    `Framework:        ${colors.cyan(framework)}`,
    `Package Manager:  ${colors.green(packageManager)}`,
    `Scripts:          ${colors.gray(scripts.slice(0, 5).join(', ') + (scripts.length > 5 ? '...' : ''))}`,
    `Total Routes:     ${colors.bold(String(routes.length))}`,
  ];
  console.log(createBox('Environment Summary', infoLines, { borderColor: colors.cyan }));
  console.log('');

  // Table of discovered routes
  const routeRows = routes.slice(0, 15).map((r) => ({
    type: r.type.toUpperCase(),
    path: r.path,
    file: colors.gray(r.file),
  }));

  const columns = [
    { header: 'Type', key: 'type', align: 'left' as const, minWidth: 8 },
    { header: 'Route Path', key: 'path', align: 'left' as const, minWidth: 32 },
    { header: 'Source File', key: 'file', align: 'left' as const },
  ];

  console.log(renderTable(columns, routeRows));
  if (routes.length > 15) {
    console.log(colors.gray(`\n  ... and ${routes.length - 15} more routes.`));
  }
  console.log(`\n  ${colors.green(symbols.tick)} Verification pre-flight analysis complete.\n`);

  return result;
}
