/**
 * Linux Cgroups v2 & Resource Limit Manager (Contribution 152)
 *
 * Provides control file generation, validation, metrics parsing, and lifecycle management
 * for Linux cgroups v2 resource isolation (CPU throttling, memory limits, swap suppression, PID ceilings).
 */

import fs from 'fs';
import path from 'path';
import type { ResourceQuotas, SandboxMetrics } from '../types/sandbox-isolation.ts';

export interface CgroupManifest {
  sandboxId: string;
  cgroupPath: string;
  directives: Record<string, string>;
  createdAt: string;
}

export interface CgroupMemoryEvents {
  low: number;
  high: number;
  max: number;
  oom: number;
  oomKill: number;
}

export interface CgroupCpuStats {
  usageUsec: number;
  userUsec: number;
  systemUsec: number;
  nrPeriods: number;
  nrThrottled: number;
  throttledUsec: number;
}

export class CgroupV2Manager {
  private baseCgroupDir: string;
  private isSimulated: boolean;

  constructor(baseCgroupDir?: string) {
    if (baseCgroupDir) {
      this.baseCgroupDir = baseCgroupDir;
      this.isSimulated = true;
    } else {
      const defaultHostCgroup = '/sys/fs/cgroup/proofix';
      const exists = process.platform === 'linux' && fs.existsSync('/sys/fs/cgroup');
      if (exists) {
        this.baseCgroupDir = defaultHostCgroup;
        this.isSimulated = false;
      } else {
        // Fallback for non-Linux or testing without host cgroups
        this.baseCgroupDir = path.join(process.cwd(), '.proofix-cgroups-simulated');
        this.isSimulated = true;
      }
    }
  }

  public getBaseDir(): string {
    return this.baseCgroupDir;
  }

  public isSimulatedMode(): boolean {
    return this.isSimulated;
  }

  /**
   * Generates key-value cgroup v2 control file directives based on ResourceQuotas.
   */
  public generateDirectives(quotas: ResourceQuotas): Record<string, string> {
    const periodUsec = 100000; // Standard 100ms CFS scheduling period
    const quotaUsec = quotas.cpuQuotaPercentage > 0
      ? Math.round((quotas.cpuQuotaPercentage / 100) * periodUsec)
      : 'max';

    const memoryMaxBytes = quotas.memoryLimitMb > 0
      ? quotas.memoryLimitMb * 1024 * 1024
      : 'max';

    // memory.high set to 85% of memory.max to trigger aggressive reclaim before OOM kill
    const memoryHighBytes = typeof memoryMaxBytes === 'number'
      ? Math.round(memoryMaxBytes * 0.85)
      : 'max';

    const swapMaxBytes = quotas.memorySwapLimitMb > 0
      ? quotas.memorySwapLimitMb * 1024 * 1024
      : '0'; // default disable swap for predictable memory budgeting

    const pidsMax = quotas.maxProcesses > 0
      ? quotas.maxProcesses.toString()
      : 'max';

    return {
      'cpu.max': `${quotaUsec} ${periodUsec}`,
      'cpu.weight': '100',
      'memory.max': memoryMaxBytes.toString(),
      'memory.high': memoryHighBytes.toString(),
      'memory.swap.max': swapMaxBytes.toString(),
      'pids.max': pidsMax,
      'io.weight': '100',
    };
  }

  /**
   * Creates a dedicated cgroup directory for a sandbox and applies directives.
   */
  public async createCgroup(sandboxId: string, quotas: ResourceQuotas): Promise<CgroupManifest> {
    const cgroupPath = path.join(this.baseCgroupDir, sandboxId);
    const directives = this.generateDirectives(quotas);

    try {
      if (!fs.existsSync(cgroupPath)) {
        fs.mkdirSync(cgroupPath, { recursive: true });
      }

      for (const [file, value] of Object.entries(directives)) {
        fs.writeFileSync(path.join(cgroupPath, file), value, 'utf8');
      }

      // Initialize empty metrics/events tracking files
      const memoryEventsPath = path.join(cgroupPath, 'memory.events');
      if (!fs.existsSync(memoryEventsPath)) {
        fs.writeFileSync(memoryEventsPath, 'low 0\nhigh 0\nmax 0\noom 0\noom_kill 0\n', 'utf8');
      }

      const memoryCurrentPath = path.join(cgroupPath, 'memory.current');
      if (!fs.existsSync(memoryCurrentPath)) {
        fs.writeFileSync(memoryCurrentPath, '0\n', 'utf8');
      }

      const pidsCurrentPath = path.join(cgroupPath, 'pids.current');
      if (!fs.existsSync(pidsCurrentPath)) {
        fs.writeFileSync(pidsCurrentPath, '0\n', 'utf8');
      }

      const cpuStatPath = path.join(cgroupPath, 'cpu.stat');
      if (!fs.existsSync(cpuStatPath)) {
        fs.writeFileSync(cpuStatPath, 'usage_usec 0\nuser_usec 0\nsystem_usec 0\nnr_periods 0\nnr_throttled 0\nthrottled_usec 0\n', 'utf8');
      }

      const cgroupProcsPath = path.join(cgroupPath, 'cgroup.procs');
      if (!fs.existsSync(cgroupProcsPath)) {
        fs.writeFileSync(cgroupProcsPath, '', 'utf8');
      }

      return {
        sandboxId,
        cgroupPath,
        directives,
        createdAt: new Date().toISOString(),
      };
    } catch (err) {
      throw new Error(`Failed to configure cgroup v2 for sandbox ${sandboxId}: ${(err as Error).message}`);
    }
  }

  /**
   * Enrolls a process PID into the sandbox's cgroup.procs.
   */
  public async assignPid(sandboxId: string, pid: number): Promise<boolean> {
    const cgroupProcsPath = path.join(this.baseCgroupDir, sandboxId, 'cgroup.procs');
    if (!fs.existsSync(cgroupProcsPath)) {
      return false;
    }
    try {
      fs.appendFileSync(cgroupProcsPath, `${pid}\n`, 'utf8');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Parses memory.events file content.
   */
  public parseMemoryEvents(content: string): CgroupMemoryEvents {
    const events: CgroupMemoryEvents = { low: 0, high: 0, max: 0, oom: 0, oomKill: 0 };
    const lines = content.split('\n');
    for (const line of lines) {
      const [key, val] = line.trim().split(/\s+/);
      const num = parseInt(val, 10) || 0;
      if (key === 'low') events.low = num;
      if (key === 'high') events.high = num;
      if (key === 'max') events.max = num;
      if (key === 'oom') events.oom = num;
      if (key === 'oom_kill') events.oomKill = num;
    }
    return events;
  }

  /**
   * Parses cpu.stat file content.
   */
  public parseCpuStat(content: string): CgroupCpuStats {
    const stats: CgroupCpuStats = {
      usageUsec: 0,
      userUsec: 0,
      systemUsec: 0,
      nrPeriods: 0,
      nrThrottled: 0,
      throttledUsec: 0,
    };
    const lines = content.split('\n');
    for (const line of lines) {
      const [key, val] = line.trim().split(/\s+/);
      const num = parseInt(val, 10) || 0;
      if (key === 'usage_usec') stats.usageUsec = num;
      if (key === 'user_usec') stats.userUsec = num;
      if (key === 'system_usec') stats.systemUsec = num;
      if (key === 'nr_periods') stats.nrPeriods = num;
      if (key === 'nr_throttled') stats.nrThrottled = num;
      if (key === 'throttled_usec') stats.throttledUsec = num;
    }
    return stats;
  }

  /**
   * Checks whether the sandbox process has experienced an OOM kill event.
   */
  public async detectOom(sandboxId: string): Promise<boolean> {
    const memoryEventsPath = path.join(this.baseCgroupDir, sandboxId, 'memory.events');
    if (!fs.existsSync(memoryEventsPath)) {
      return false;
    }
    try {
      const content = fs.readFileSync(memoryEventsPath, 'utf8');
      const events = this.parseMemoryEvents(content);
      return events.oomKill > 0 || events.oom > 0;
    } catch {
      return false;
    }
  }

  /**
   * Reads current resource usage metrics from cgroup v2 status files.
   */
  public async readMetrics(sandboxId: string): Promise<SandboxMetrics> {
    const cgroupPath = path.join(this.baseCgroupDir, sandboxId);
    let currentMemoryUsageMb = 0;
    let peakMemoryUsageMb = 0;
    let activeProcessCount = 0;
    let cpuPercentage = 0;

    try {
      const memCurrentPath = path.join(cgroupPath, 'memory.current');
      if (fs.existsSync(memCurrentPath)) {
        const bytes = parseInt(fs.readFileSync(memCurrentPath, 'utf8').trim(), 10) || 0;
        currentMemoryUsageMb = Math.round((bytes / (1024 * 1024)) * 100) / 100;
        peakMemoryUsageMb = currentMemoryUsageMb;
      }

      const pidsCurrentPath = path.join(cgroupPath, 'pids.current');
      if (fs.existsSync(pidsCurrentPath)) {
        activeProcessCount = parseInt(fs.readFileSync(pidsCurrentPath, 'utf8').trim(), 10) || 0;
      }

      const cpuStatPath = path.join(cgroupPath, 'cpu.stat');
      if (fs.existsSync(cpuStatPath)) {
        const stats = this.parseCpuStat(fs.readFileSync(cpuStatPath, 'utf8'));
        // Estimate rough CPU percentage if stats present
        if (stats.nrPeriods > 0) {
          cpuPercentage = Math.round(((stats.nrPeriods - stats.nrThrottled) / stats.nrPeriods) * 100);
        }
      }
    } catch {
      // Return safe zeroed fallback
    }

    return {
      currentMemoryUsageMb,
      peakMemoryUsageMb,
      cpuPercentage,
      activeProcessCount,
      ioReadBytes: 0,
      ioWriteBytes: 0,
      egressPacketsBlocked: 0,
    };
  }

  /**
   * Cleans up cgroup directory and releases all allocations.
   */
  public async cleanupCgroup(sandboxId: string): Promise<boolean> {
    const cgroupPath = path.join(this.baseCgroupDir, sandboxId);
    if (!fs.existsSync(cgroupPath)) {
      return true;
    }

    try {
      fs.rmSync(cgroupPath, { recursive: true, force: true });
      return true;
    } catch {
      return false;
    }
  }
}
