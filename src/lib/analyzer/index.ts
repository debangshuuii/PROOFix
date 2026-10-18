import fs from 'fs';
import path from 'path';
import { ProjectAnalysis, DiscoveredRoute } from '../types';

export async function analyzeRepository(repoPath: string): Promise<ProjectAnalysis> {
  const analysis: ProjectAnalysis = {
    framework: 'Unknown / Generic Web',
    runtime: 'Node.js',
    packageManager: 'npm',
    scripts: {},
    entryPoints: [],
    routes: [],
    envVarsDetected: [],
    existingTests: [],
    dockerConfig: {
      hasDockerfile: false,
      hasDockerCompose: false,
    },
    inferredStartup: {
      command: 'npm run start',
      port: 3000,
      readinessPath: '/',
      confidence: 'medium',
      rationale: 'Default web application startup inferred.',
    },
    blockers: [],
  };

  if (!fs.existsSync(repoPath)) {
    analysis.blockers.push({
      severity: 'error',
      message: `Repository directory not found at path: ${repoPath}`,
      suggestedResolution: 'Ensure repository has been imported or uploaded properly.',
    });
    return analysis;
  }

  // 1. Detect Package Manager & Package.json
  const pkgPath = path.join(repoPath, 'package.json');
  let pkgJson: Record<string, any> = {};

  if (fs.existsSync(path.join(repoPath, 'pnpm-lock.yaml'))) {
    analysis.packageManager = 'pnpm';
  } else if (fs.existsSync(path.join(repoPath, 'yarn.lock'))) {
    analysis.packageManager = 'yarn';
  } else if (fs.existsSync(path.join(repoPath, 'bun.lockb'))) {
    analysis.packageManager = 'bun';
  } else {
    analysis.packageManager = 'npm';
  }

  if (fs.existsSync(pkgPath)) {
    try {
      const raw = fs.readFileSync(pkgPath, 'utf-8');
      pkgJson = JSON.parse(raw);
      analysis.scripts = pkgJson.scripts || {};

      const allDeps = {
        ...(pkgJson.dependencies || {}),
        ...(pkgJson.devDependencies || {}),
      };

      // Framework Detection
      if (allDeps['next']) {
        analysis.framework = 'Next.js';
        analysis.runtime = 'Node.js';
      } else if (allDeps['nuxt'] || allDeps['vue']) {
        analysis.framework = allDeps['nuxt'] ? 'Nuxt.js' : 'Vue.js';
        analysis.runtime = 'Node.js';
      } else if (allDeps['@sveltejs/kit'] || allDeps['svelte']) {
        analysis.framework = allDeps['@sveltejs/kit'] ? 'SvelteKit' : 'Svelte';
        analysis.runtime = 'Node.js';
      } else if (allDeps['@angular/core']) {
        analysis.framework = 'Angular';
        analysis.runtime = 'Node.js';
      } else if (allDeps['vite']) {
        analysis.framework = allDeps['react'] ? 'Vite + React' : 'Vite';
        analysis.runtime = 'Node.js';
      } else if (allDeps['react']) {
        analysis.framework = 'React (SPA)';
        analysis.runtime = 'Node.js';
      } else if (allDeps['express']) {
        analysis.framework = 'Express.js';
        analysis.runtime = 'Node.js';
      } else if (allDeps['fastify']) {
        analysis.framework = 'Fastify';
        analysis.runtime = 'Node.js';
      }

      // Existing Tests
      if (allDeps['@playwright/test'] || allDeps['playwright']) {
        analysis.existingTests.push('Playwright');
      }
      if (allDeps['vitest']) {
        analysis.existingTests.push('Vitest');
      }
      if (allDeps['jest']) {
        analysis.existingTests.push('Jest');
      }
      if (allDeps['cypress']) {
        analysis.existingTests.push('Cypress');
      }
    } catch (err: any) {
      analysis.blockers.push({
        severity: 'error',
        message: `Failed to parse package.json: ${err.message}`,
        suggestedResolution: 'Validate JSON syntax in package.json.',
      });
    }
  } else {
    // Check for Python or static projects
    if (fs.existsSync(path.join(repoPath, 'requirements.txt')) || fs.existsSync(path.join(repoPath, 'pyproject.toml'))) {
      analysis.runtime = 'Python';
      analysis.framework = 'Python Web';
    } else if (fs.existsSync(path.join(repoPath, 'index.html'))) {
      analysis.framework = 'Static HTML/JS';
      analysis.runtime = 'Static Web';
    }
  }

  // 2. Discover Routes
  const discoveredRoutes: DiscoveredRoute[] = [];

  // Next.js App Router routes
  const appDirs = [
    path.join(repoPath, 'src', 'app'),
    path.join(repoPath, 'app'),
  ];

  for (const appDir of appDirs) {
    if (fs.existsSync(appDir)) {
      discoverAppRouterRoutes(appDir, appDir, discoveredRoutes);
      break;
    }
  }

  // Next.js Pages Router routes
  const pagesDirs = [
    path.join(repoPath, 'src', 'pages'),
    path.join(repoPath, 'pages'),
  ];

  for (const pagesDir of pagesDirs) {
    if (fs.existsSync(pagesDir)) {
      discoverPagesRouterRoutes(pagesDir, pagesDir, discoveredRoutes);
      break;
    }
  }

  // If no routes found yet, check static html files or add root
  if (discoveredRoutes.length === 0) {
    if (fs.existsSync(path.join(repoPath, 'index.html'))) {
      discoveredRoutes.push({
        path: '/',
        type: 'page',
        fileSource: 'index.html',
        isDynamic: false,
      });
    } else {
      discoveredRoutes.push({
        path: '/',
        type: 'page',
        fileSource: 'Inferred root endpoint',
        isDynamic: false,
      });
    }
  }

  analysis.routes = discoveredRoutes;

  // 3. Entry points
  const candidateEntryPoints = [
    'src/app/page.tsx',
    'src/app/page.jsx',
    'src/app/page.js',
    'app/page.tsx',
    'src/pages/index.tsx',
    'pages/index.tsx',
    'src/main.tsx',
    'src/main.ts',
    'src/index.tsx',
    'src/index.js',
    'index.html',
    'server.js',
    'app.js',
  ];

  for (const entry of candidateEntryPoints) {
    if (fs.existsSync(path.join(repoPath, entry))) {
      analysis.entryPoints.push(entry);
    }
  }

  // 4. Discover Environment Variable Names (strictly redacting values)
  const envFiles = ['.env.example', '.env.template', '.env.sample', 'example.env', '.env.local.example'];
  const envVarNames = new Set<string>();

  for (const envFile of envFiles) {
    const fullEnvPath = path.join(repoPath, envFile);
    if (fs.existsSync(fullEnvPath)) {
      try {
        const lines = fs.readFileSync(fullEnvPath, 'utf-8').split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            const eqIdx = trimmed.indexOf('=');
            if (eqIdx !== -1) {
              const varName = trimmed.slice(0, eqIdx).trim();
              if (varName && /^[A-Za-z_][A-Za-z0-9_]*$/.test(varName)) {
                envVarNames.add(varName);
              }
            }
          }
        }
      } catch {}
    }
  }

  analysis.envVarsDetected = Array.from(envVarNames);

  // 5. Docker Configuration
  analysis.dockerConfig.hasDockerfile = fs.existsSync(path.join(repoPath, 'Dockerfile'));
  analysis.dockerConfig.hasDockerCompose =
    fs.existsSync(path.join(repoPath, 'docker-compose.yml')) ||
    fs.existsSync(path.join(repoPath, 'docker-compose.yaml'));

  // 6. Inferred Startup Strategy
  if (analysis.scripts['dev']) {
    const devScript = analysis.scripts['dev'];
    let inferredPort = 3000;
    const portMatch = devScript.match(/-p\s+(\d+)|--port\s+(\d+)|PORT=(\d+)/);
    if (portMatch) {
      inferredPort = parseInt(portMatch[1] || portMatch[2] || portMatch[3], 10);
    }

    analysis.inferredStartup = {
      command: `${analysis.packageManager} run dev`,
      port: inferredPort,
      readinessPath: '/',
      confidence: 'high',
      rationale: `Detected standard "${analysis.packageManager} run dev" script in package.json.`,
    };
  } else if (analysis.scripts['start']) {
    analysis.inferredStartup = {
      command: `${analysis.packageManager} run start`,
      port: 3000,
      readinessPath: '/',
      confidence: 'medium',
      rationale: `Detected "${analysis.packageManager} run start" script in package.json.`,
    };
  } else {
    analysis.inferredStartup = {
      command: 'npx serve .',
      port: 3000,
      readinessPath: '/',
      confidence: 'low',
      rationale: 'No startup scripts found in package.json; falling back to static server.',
    };
    analysis.blockers.push({
      severity: 'warning',
      message: 'No "dev" or "start" script found in package.json.',
      suggestedResolution: 'Configure a dev or start script in package.json.',
    });
  }

  // 7. Check for potential missing env vars blocker
  if (analysis.envVarsDetected.length > 0) {
    analysis.blockers.push({
      severity: 'warning',
      message: `Project references ${analysis.envVarsDetected.length} environment variables (${analysis.envVarsDetected.slice(0, 3).join(', ')}${analysis.envVarsDetected.length > 3 ? ', ...' : ''}).`,
      suggestedResolution: 'Verify necessary mock or test environment variables are configured before verification.',
    });
  }

  return analysis;
}

function discoverAppRouterRoutes(currentDir: string, baseDir: string, routes: DiscoveredRoute[]) {
  try {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        // Skip hidden and special folders
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        discoverAppRouterRoutes(fullPath, baseDir, routes);
      } else if (entry.isFile()) {
        const isPage = /^page\.(tsx|jsx|js|ts)$/.test(entry.name);
        const isApi = /^route\.(ts|js)$/.test(entry.name);

        if (isPage || isApi) {
          const relDir = path.relative(baseDir, currentDir).replace(/\\/g, '/');
          let routePath = '/' + relDir;
          // Handle Next.js route groups like (marketing)
          routePath = routePath.replace(/\/\([^)]+\)/g, '');
          if (routePath === '' || routePath === '/.') routePath = '/';

          const isDynamic = /\[[^\]]+\]/.test(routePath);

          routes.push({
            path: routePath,
            type: isApi ? 'api' : 'page',
            method: isApi ? 'GET' : undefined,
            fileSource: path.relative(path.resolve(baseDir, '..', '..'), fullPath).replace(/\\/g, '/'),
            isDynamic,
          });
        }
      }
    }
  } catch {}
}

function discoverPagesRouterRoutes(currentDir: string, baseDir: string, routes: DiscoveredRoute[]) {
  try {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        discoverPagesRouterRoutes(fullPath, baseDir, routes);
      } else if (entry.isFile()) {
        if (/\.(tsx|jsx|js|ts)$/.test(entry.name)) {
          // ignore _app, _document
          if (entry.name.startsWith('_')) continue;

          const baseName = entry.name.replace(/\.(tsx|jsx|js|ts)$/, '');
          const relDir = path.relative(baseDir, currentDir).replace(/\\/g, '/');
          let routePath = '/' + (relDir ? relDir + '/' : '') + (baseName === 'index' ? '' : baseName);
          if (routePath === '') routePath = '/';

          const isApi = routePath.startsWith('/api');
          const isDynamic = /\[[^\]]+\]/.test(routePath);

          // Avoid duplicate routes
          if (!routes.some((r) => r.path === routePath)) {
            routes.push({
              path: routePath,
              type: isApi ? 'api' : 'page',
              method: isApi ? 'GET' : undefined,
              fileSource: path.relative(path.resolve(baseDir, '..', '..'), fullPath).replace(/\\/g, '/'),
              isDynamic,
            });
          }
        }
      }
    }
  } catch {}
}
