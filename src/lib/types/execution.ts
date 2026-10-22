/**
 * Multi-Runtime Execution & Process Launcher Types
 * Covers multi-framework startup resolution, dynamic port allocation,
 * process tree tracking, and adaptive readiness probing.
 */

export type SupportedFramework =
  | 'nextjs'
  | 'vite'
  | 'create-react-app'
  | 'remix'
  | 'vue'
  | 'sveltekit'
  | 'astro'
  | 'express'
  | 'fastify'
  | 'static'
  | 'custom';

export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun';

export interface RuntimeProfile {
  id: SupportedFramework;
  name: string;
  defaultDevCommand: string;
  defaultStartCommand: string;
  defaultPort: number;
  readinessPath: string;
  portFlag: string;
  envPrefix?: string;
}

export interface ExecutionLaunchConfig {
  workspaceDir: string;
  framework: SupportedFramework;
  packageManager: PackageManager;
  customStartupCommand?: string;
  customBuildCommand?: string;
  customInstallCommand?: string;
  targetPort: number;
  readinessPath: string;
  readinessTimeoutMs: number;
  maxRetries: number;
  env?: Record<string, string>;
  preferProductionBuild?: boolean;
}

export interface PortAllocationResult {
  allocatedPort: number;
  wasCollision: boolean;
  attemptedPorts: number[];
  reassigned: boolean;
}

export interface ReadinessProbeOptions {
  host?: string;
  port: number;
  path: string;
  timeoutMs: number;
  pollIntervalMs?: number;
  expectedStatusMin?: number;
  expectedStatusMax?: number;
  headers?: Record<string, string>;
}

export interface ReadinessProbeResult {
  ready: boolean;
  statusCode?: number;
  responseTimeMs: number;
  attempts: number;
  errorMessage?: string;
}

export interface ManagedProcess {
  pid: number;
  runId: string;
  framework: SupportedFramework;
  port: number;
  command: string;
  startedAt: string;
  active: boolean;
  childPids: number[];
}

export interface ProcessKillResult {
  success: boolean;
  killedPid: number;
  killedChildPids: number[];
  exitCode?: number | null;
  signal?: string;
  durationMs: number;
}
