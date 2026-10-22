/**
 * Multi-Framework Command Resolver & Package Script Inferrer
 * Inspects package.json dependencies and scripts to determine the exact
 * execution runtime, launch command, port flag, and readiness defaults.
 */

import fs from 'fs';
import path from 'path';
import type {
  SupportedFramework,
  PackageManager,
  RuntimeProfile,
  ExecutionLaunchConfig,
} from '../types/execution.ts';

export const FRAMEWORK_PROFILES: Record<SupportedFramework, RuntimeProfile> = {
  nextjs: {
    id: 'nextjs',
    name: 'Next.js',
    defaultDevCommand: 'next dev',
    defaultStartCommand: 'next start',
    defaultPort: 3000,
    readinessPath: '/',
    portFlag: '-p',
    envPrefix: 'NEXT_PUBLIC_',
  },
  vite: {
    id: 'vite',
    name: 'Vite',
    defaultDevCommand: 'vite',
    defaultStartCommand: 'vite preview',
    defaultPort: 5173,
    readinessPath: '/',
    portFlag: '--port',
    envPrefix: 'VITE_',
  },
  'create-react-app': {
    id: 'create-react-app',
    name: 'Create React App',
    defaultDevCommand: 'react-scripts start',
    defaultStartCommand: 'serve -s build',
    defaultPort: 3000,
    readinessPath: '/',
    portFlag: '',
    envPrefix: 'REACT_APP_',
  },
  remix: {
    id: 'remix',
    name: 'Remix',
    defaultDevCommand: 'remix dev',
    defaultStartCommand: 'remix-serve build',
    defaultPort: 3000,
    readinessPath: '/',
    portFlag: '--port',
  },
  vue: {
    id: 'vue',
    name: 'Vue CLI / Nuxt',
    defaultDevCommand: 'vue-cli-service serve',
    defaultStartCommand: 'nuxt start',
    defaultPort: 8080,
    readinessPath: '/',
    portFlag: '--port',
  },
  sveltekit: {
    id: 'sveltekit',
    name: 'SvelteKit',
    defaultDevCommand: 'vite dev',
    defaultStartCommand: 'node build',
    defaultPort: 5173,
    readinessPath: '/',
    portFlag: '--port',
  },
  astro: {
    id: 'astro',
    name: 'Astro',
    defaultDevCommand: 'astro dev',
    defaultStartCommand: 'astro preview',
    defaultPort: 4321,
    readinessPath: '/',
    portFlag: '--port',
  },
  express: {
    id: 'express',
    name: 'Express / Node.js Server',
    defaultDevCommand: 'node server.js',
    defaultStartCommand: 'node index.js',
    defaultPort: 3000,
    readinessPath: '/health',
    portFlag: '',
  },
  fastify: {
    id: 'fastify',
    name: 'Fastify',
    defaultDevCommand: 'fastify start server.js',
    defaultStartCommand: 'node server.js',
    defaultPort: 3000,
    readinessPath: '/health',
    portFlag: '--port',
  },
  static: {
    id: 'static',
    name: 'Static HTML / HTTP Server',
    defaultDevCommand: 'npx serve .',
    defaultStartCommand: 'npx serve .',
    defaultPort: 5000,
    readinessPath: '/',
    portFlag: '-p',
  },
  custom: {
    id: 'custom',
    name: 'Custom Application',
    defaultDevCommand: 'npm start',
    defaultStartCommand: 'npm start',
    defaultPort: 3000,
    readinessPath: '/',
    portFlag: '--port',
  },
};

export interface ResolvedSpawnConfig {
  executable: string;
  args: string[];
  shell: boolean;
  cwd: string;
  env: Record<string, string>;
  framework: SupportedFramework;
  port: number;
  readinessPath: string;
}

/**
 * Detects package manager from lockfiles in directory hierarchy.
 */
export function detectPackageManager(workspaceDir: string): PackageManager {
  if (fs.existsSync(path.join(workspaceDir, 'pnpm-lock.yaml'))) return 'pnpm';
  if (fs.existsSync(path.join(workspaceDir, 'yarn.lock'))) return 'yarn';
  if (fs.existsSync(path.join(workspaceDir, 'bun.lockb')) || fs.existsSync(path.join(workspaceDir, 'bun.lock'))) return 'bun';
  return 'npm';
}

/**
 * Detects framework from package.json dependencies and scripts.
 */
export function detectFramework(workspaceDir: string): SupportedFramework {
  const pkgPath = path.join(workspaceDir, 'package.json');
  if (!fs.existsSync(pkgPath)) return 'static';

  try {
    const raw = fs.readFileSync(pkgPath, 'utf-8');
    const pkg = JSON.parse(raw);
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    if (deps['next']) return 'nextjs';
    if (deps['astro']) return 'astro';
    if (deps['@sveltejs/kit']) return 'sveltekit';
    if (deps['@remix-run/react'] || deps['@remix-run/serve']) return 'remix';
    if (deps['vite']) return 'vite';
    if (deps['nuxt'] || deps['vue-cli-service']) return 'vue';
    if (deps['react-scripts']) return 'create-react-app';
    if (deps['fastify']) return 'fastify';
    if (deps['express']) return 'express';

    // Check script commands
    const scripts = pkg.scripts || {};
    const scriptValues = Object.values(scripts).join(' ');
    if (scriptValues.includes('next dev')) return 'nextjs';
    if (scriptValues.includes('vite')) return 'vite';
    if (scriptValues.includes('astro')) return 'astro';

    return 'custom';
  } catch {
    return 'custom';
  }
}

/**
 * Resolves full spawn execution parameters for launching the application server.
 */
export function resolveSpawnConfig(config: ExecutionLaunchConfig): ResolvedSpawnConfig {
  const {
    workspaceDir,
    framework,
    packageManager,
    customStartupCommand,
    targetPort,
    readinessPath,
    env = {},
  } = config;

  const isWin = process.platform === 'win32';
  const profile = FRAMEWORK_PROFILES[framework] || FRAMEWORK_PROFILES.custom;
  const mergedEnv: Record<string, string> = {
    ...process.env as Record<string, string>,
    ...env,
    PORT: targetPort.toString(),
    NODE_ENV: config.preferProductionBuild ? 'production' : 'development',
  };

  if (profile.envPrefix) {
    mergedEnv[`${profile.envPrefix}PORT`] = targetPort.toString();
  }

  // 1. User-specified Custom Startup Command
  if (customStartupCommand && customStartupCommand.trim().length > 0) {
    const parts = customStartupCommand.trim().split(/\s+/);
    const cmd = parts[0];
    const args = parts.slice(1);

    // If port isn't explicitly mentioned in custom command, append it if flag exists
    if (profile.portFlag && !customStartupCommand.includes(profile.portFlag) && !customStartupCommand.includes(targetPort.toString())) {
      args.push(profile.portFlag, targetPort.toString());
    }

    return {
      executable: isWin && !cmd.endsWith('.cmd') && !cmd.endsWith('.exe') ? `${cmd}.cmd` : cmd,
      args,
      shell: true,
      cwd: workspaceDir,
      env: mergedEnv,
      framework,
      port: targetPort,
      readinessPath: readinessPath || profile.readinessPath,
    };
  }

  // 2. Package scripts check
  const pkgPath = path.join(workspaceDir, 'package.json');
  let hasDevScript = false;
  let hasStartScript = false;

  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      hasDevScript = Boolean(pkg.scripts?.dev);
      hasStartScript = Boolean(pkg.scripts?.start);
    } catch {}
  }

  let executable = packageManager === 'npm' ? (isWin ? 'npm.cmd' : 'npm') : packageManager;
  let args: string[] = [];

  if (framework === 'nextjs') {
    executable = isWin ? 'npx.cmd' : 'npx';
    args = config.preferProductionBuild && hasStartScript
      ? ['next', 'start', '-p', targetPort.toString()]
      : ['next', 'dev', '-p', targetPort.toString()];
  } else if (framework === 'vite' || framework === 'sveltekit') {
    executable = isWin ? 'npx.cmd' : 'npx';
    args = ['vite', '--port', targetPort.toString(), '--host', 'localhost'];
  } else if (framework === 'astro') {
    executable = isWin ? 'npx.cmd' : 'npx';
    args = ['astro', 'dev', '--port', targetPort.toString(), '--host', 'localhost'];
  } else if (hasDevScript) {
    args = ['run', 'dev', '--', profile.portFlag, targetPort.toString()].filter(Boolean);
  } else if (hasStartScript) {
    args = ['run', 'start', '--', profile.portFlag, targetPort.toString()].filter(Boolean);
  } else {
    // Fallback to npx serve or node
    executable = isWin ? 'npx.cmd' : 'npx';
    args = ['serve', '-p', targetPort.toString(), '.'];
  }

  return {
    executable,
    args,
    shell: true,
    cwd: workspaceDir,
    env: mergedEnv,
    framework,
    port: targetPort,
    readinessPath: readinessPath || profile.readinessPath,
  };
}
