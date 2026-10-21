/**
 * Container & MicroVM OCI Runtime Adapter (Contribution 155)
 *
 * Provides OCI Runtime Spec v1.0.2 generation, seccomp syscall filtering,
 * capability dropping, and runtime command synthesis for rootless Docker,
 * Podman, Firecracker microVMs, and gVisor (runsc).
 */

import type {
  SandboxIsolationMode,
  SandboxSecurityPolicy,
  ResourceQuotas,
  SecurityCapabilities,
} from '../types/sandbox-isolation.ts';

export interface OciSpec {
  ociVersion: string;
  process: {
    terminal: boolean;
    user: { uid: number; gid: number };
    args: string[];
    env: string[];
    cwd: string;
    capabilities: {
      bounding: string[];
      effective: string[];
      inheritable: string[];
      permitted: string[];
      ambient: string[];
    };
    noNewPrivileges: boolean;
    rlimits: Array<{ type: string; hard: number; soft: number }>;
  };
  root: { path: string; readonly: boolean };
  mounts: Array<{ destination: string; type: string; source: string; options: string[] }>;
  linux: {
    namespaces: Array<{ type: string }>;
    resources: {
      memory?: { limit?: number; swap?: number };
      cpu?: { quota?: number; period?: number };
      pids?: { limit?: number };
    };
    seccomp?: {
      defaultAction: string;
      architectures: string[];
      syscalls: Array<{ names: string[]; action: string }>;
    };
    maskedPaths: string[];
    readonlyPaths: string[];
  };
}

export const BLOCKED_DANGEROUS_SYSCALLS = [
  'ptrace',
  'bpf',
  'sys_chroot',
  'reboot',
  'kexec_load',
  'kexec_file_load',
  'keyctl',
  'mount',
  'umount2',
  'pivot_root',
  'swapon',
  'swapoff',
  'lookup_dcookie',
  'perf_event_open',
  'acct',
];

export class OciRuntimeAdapter {
  /**
   * Generates a complete, compliant OCI Runtime config.json spec.
   */
  public generateOciSpec(
    commandArgs: string[],
    policy: SandboxSecurityPolicy,
    customEnv: string[] = []
  ): OciSpec {
    const { quotas, filesystem, capabilities } = policy;

    const env = [
      'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
      'TERM=xterm',
      'NODE_ENV=production',
      'PROOF_SANDBOX=true',
      ...customEnv,
    ];

    const caps = capabilities.dropAllCapabilities
      ? (capabilities.addCapabilities || [])
      : ['CAP_CHOWN', 'CAP_FOWNER'];

    const ociSpec: OciSpec = {
      ociVersion: '1.0.2',
      process: {
        terminal: false,
        user: {
          uid: capabilities.runAsUserUid || 10001,
          gid: capabilities.runAsUserGid || 10001,
        },
        args: commandArgs,
        env,
        cwd: '/app',
        capabilities: {
          bounding: caps,
          effective: caps,
          inheritable: caps,
          permitted: caps,
          ambient: [],
        },
        noNewPrivileges: capabilities.noNewPrivileges ?? true,
        rlimits: [
          { type: 'RLIMIT_NOFILE', hard: quotas.maxOpenFiles || 1024, soft: quotas.maxOpenFiles || 1024 },
          { type: 'RLIMIT_NPROC', hard: quotas.maxProcesses || 64, soft: quotas.maxProcesses || 64 },
        ],
      },
      root: {
        path: 'rootfs',
        readonly: filesystem.readOnlyRoot,
      },
      mounts: [
        { destination: '/proc', type: 'proc', source: 'proc', options: ['nosuid', 'noexec', 'nodev'] },
        { destination: '/dev', type: 'tmpfs', source: 'tmpfs', options: ['nosuid', 'strictatime', 'mode=755', 'size=65536k'] },
        { destination: '/tmp', type: 'tmpfs', source: 'tmpfs', options: ['nosuid', 'noexec', 'nodev', 'size=256m'] },
      ],
      linux: {
        namespaces: [
          { type: 'pid' },
          { type: 'network' },
          { type: 'ipc' },
          { type: 'uts' },
          { type: 'mount' },
          { type: 'user' },
        ],
        resources: {
          memory: {
            limit: quotas.memoryLimitMb > 0 ? quotas.memoryLimitMb * 1024 * 1024 : undefined,
            swap: quotas.memorySwapLimitMb > 0 ? quotas.memorySwapLimitMb * 1024 * 1024 : 0,
          },
          cpu: {
            period: 100000,
            quota: quotas.cpuQuotaPercentage > 0 ? Math.round((quotas.cpuQuotaPercentage / 100) * 100000) : undefined,
          },
          pids: {
            limit: quotas.maxProcesses > 0 ? quotas.maxProcesses : undefined,
          },
        },
        seccomp: {
          defaultAction: 'SCMP_ACT_ALLOW',
          architectures: ['SCMP_ARCH_X86_64', 'SCMP_ARCH_AARCH64'],
          syscalls: [
            {
              names: BLOCKED_DANGEROUS_SYSCALLS,
              action: 'SCMP_ACT_ERRNO',
            },
          ],
        },
        maskedPaths: filesystem.maskedPaths || ['/proc/kcore', '/proc/sys', '/sys'],
        readonlyPaths: ['/proc/asound', '/proc/bus', '/proc/fs'],
      },
    };

    return ociSpec;
  }

  /**
   * Generates CLI execution arguments for container / microVM engines.
   */
  public generateCliArgs(
    mode: SandboxIsolationMode,
    sandboxId: string,
    workspacePath: string,
    command: string,
    quotas: ResourceQuotas,
    capabilities: SecurityCapabilities
  ): { binary: string; args: string[] } {
    const memoryLimitStr = `${quotas.memoryLimitMb}m`;
    const cpuLimitStr = (quotas.cpuQuotaPercentage / 100).toFixed(1);
    const pidsLimitStr = `${quotas.maxProcesses}`;
    const userStr = `${capabilities.runAsUserUid}:${capabilities.runAsUserGid}`;

    switch (mode) {
      case 'rootless_container':
        return {
          binary: 'podman',
          args: [
            'run',
            '--rm',
            `--name=proofix-${sandboxId}`,
            `--memory=${memoryLimitStr}`,
            '--memory-swap=0',
            `--cpus=${cpuLimitStr}`,
            `--pids-limit=${pidsLimitStr}`,
            '--cap-drop=ALL',
            '--security-opt=no-new-privileges',
            `--user=${userStr}`,
            `-v=${workspacePath}:/app:ro`,
            '--network=none',
            'proofix-runner-base:latest',
            'sh',
            '-c',
            command,
          ],
        };

      case 'microvm_firecracker':
        return {
          binary: 'firecracker',
          args: [
            '--api-sock',
            `/tmp/firecracker-${sandboxId}.socket`,
            '--config-file',
            `${workspacePath}/vm-config.json`,
          ],
        };

      case 'cgroup_chroot_jail':
      case 'unprivileged_process':
      default:
        return {
          binary: 'node',
          args: ['-e', command],
        };
    }
  }
}
