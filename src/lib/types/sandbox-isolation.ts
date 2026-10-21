/**
 * Sandbox Isolation & Resource Quotas Architecture Types (Contribution 151)
 */

export type SandboxIsolationMode =
  | 'microvm_firecracker'
  | 'rootless_container'
  | 'cgroup_chroot_jail'
  | 'unprivileged_process';

export type SandboxState =
  | 'provisioning'
  | 'warm_idle'
  | 'executing'
  | 'terminating'
  | 'terminated'
  | 'oom_killed'
  | 'timeout_killed'
  | 'error';

export interface ResourceQuotas {
  memoryLimitMb: number;
  memorySwapLimitMb: number;
  cpuQuotaPercentage: number; // e.g. 100% = 1 core, 200% = 2 cores
  maxProcesses: number;       // PID ceiling to prevent fork bombs
  maxOpenFiles: number;       // File descriptor limit (rlimit_nofile)
  diskQuotaMb: number;        // Ephemeral scratch disk limit
  executionTimeoutSecs: number;
}

export interface NetworkShieldPolicy {
  allowEgress: boolean;
  blockCloudMetadata: boolean; // Blocks 169.254.169.254, fd00:ec2::254
  allowedDomains: string[];    // Whitelisted egress domains
  allowedPorts: number[];      // e.g. [80, 443]
  isolatedBridgeNetwork: boolean;
}

export interface FilesystemMountPolicy {
  readOnlyRoot: boolean;
  tmpfsMounts: string[];       // e.g. ['/tmp', '/run']
  maskedPaths: string[];       // e.g. ['/proc/sys', '/sys', '/boot']
  copyOnWriteWorkspace: boolean;
  cleanupOnExit: boolean;
}

export interface SecurityCapabilities {
  dropAllCapabilities: boolean; // --cap-drop=ALL
  addCapabilities: string[];    // explicitly allowed caps (if any)
  noNewPrivileges: boolean;     // --security-opt=no-new-privileges
  runAsUserUid: number;         // non-root UID e.g. 10001
  runAsUserGid: number;         // non-root GID e.g. 10001
  seccompProfile?: string;      // default, strict, custom
}

export interface SandboxSecurityPolicy {
  isolationMode: SandboxIsolationMode;
  quotas: ResourceQuotas;
  network: NetworkShieldPolicy;
  filesystem: FilesystemMountPolicy;
  capabilities: SecurityCapabilities;
}

export interface SandboxMetrics {
  currentMemoryUsageMb: number;
  peakMemoryUsageMb: number;
  cpuPercentage: number;
  activeProcessCount: number;
  ioReadBytes: number;
  ioWriteBytes: number;
  egressPacketsBlocked: number;
}

export interface SandboxExecutionResult {
  sandboxId: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  metrics: SandboxMetrics;
  killedByOom: boolean;
  killedByTimeout: boolean;
  isolationMode: SandboxIsolationMode;
  terminatedCleanly: boolean;
}

export interface SandboxInstance {
  id: string;
  runId: string;
  mode: SandboxIsolationMode;
  state: SandboxState;
  workspacePath: string;
  policy: SandboxSecurityPolicy;
  metrics: SandboxMetrics;
  createdAt: string;
  updatedAt: string;
}

export interface SandboxPoolStats {
  totalWarmInstances: number;
  activeExecutingInstances: number;
  totalTerminatedInstances: number;
  totalOomKills: number;
  totalTimeouts: number;
}
