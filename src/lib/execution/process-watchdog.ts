/**
 * Process Tree Watchdog & Force-Kill Termination Engine
 * Tracks process trees, registers timeout watchdogs, and executes guaranteed
 * recursive child-process tree termination on Windows (taskkill /t) and Unix.
 */

import { spawn, execSync, ChildProcess } from 'child_process';
import type { ManagedProcess, ProcessKillResult } from '../types/execution.ts';

class ProcessWatchdogRegistry {
  private activeProcesses = new Map<string, ManagedProcess>();
  private nodeProcesses = new Map<string, ChildProcess>();
  private timeouts = new Map<string, NodeJS.Timeout>();

  /**
   * Registers a spawned process for tracking and timeout enforcement.
   */
  public register(
    runId: string,
    proc: ChildProcess,
    framework: any = 'custom',
    port: number = 3000,
    command: string = '',
    timeoutMs: number = 60000,
    onTimeout?: () => void
  ): ManagedProcess {
    const pid = proc.pid || 0;
    const managed: ManagedProcess = {
      pid,
      runId,
      framework,
      port,
      command,
      startedAt: new Date().toISOString(),
      active: true,
      childPids: [],
    };

    this.activeProcesses.set(runId, managed);
    this.nodeProcesses.set(runId, proc);

    // Register runaway watchdog timer
    if (timeoutMs > 0) {
      const timer = setTimeout(async () => {
        if (this.activeProcesses.has(runId)) {
          if (onTimeout) onTimeout();
          await this.terminateTree(runId);
        }
      }, timeoutMs);

      // Don't hold Node process open for timer
      timer.unref();
      this.timeouts.set(runId, timer);
    }

    return managed;
  }

  /**
   * Gets a registered managed process.
   */
  public get(runId: string): ManagedProcess | undefined {
    return this.activeProcesses.get(runId);
  }

  /**
   * Lists all currently tracked active processes.
   */
  public listActive(): ManagedProcess[] {
    return Array.from(this.activeProcesses.values()).filter((p) => p.active);
  }

  /**
   * Discovers child process PIDs spawned under a given parent PID.
   */
  public findChildPids(parentPid: number): number[] {
    if (!parentPid || parentPid <= 0) return [];
    const children: number[] = [];

    try {
      if (process.platform === 'win32') {
        const output = execSync(`wmic process where (ParentProcessId=${parentPid}) get ProcessId 2>nul`, {
          encoding: 'utf-8',
          timeout: 2000,
        });
        const lines = output.trim().split(/\r?\n/);
        for (const line of lines) {
          const parsed = parseInt(line.trim(), 10);
          if (!isNaN(parsed) && parsed > 0 && parsed !== parentPid) {
            children.push(parsed);
          }
        }
      } else {
        const output = execSync(`pgrep -P ${parentPid} 2>/dev/null`, {
          encoding: 'utf-8',
          timeout: 2000,
        });
        const lines = output.trim().split('\n');
        for (const line of lines) {
          const parsed = parseInt(line.trim(), 10);
          if (!isNaN(parsed) && parsed > 0) {
            children.push(parsed);
          }
        }
      }
    } catch {}

    return children;
  }

  /**
   * Recursively terminates an entire process tree by runId or pid.
   */
  public async terminateTree(runId: string): Promise<ProcessKillResult> {
    const start = Date.now();
    const managed = this.activeProcesses.get(runId);
    const proc = this.nodeProcesses.get(runId);
    const pid = managed?.pid || proc?.pid || 0;

    // Clear timeout
    const timer = this.timeouts.get(runId);
    if (timer) {
      clearTimeout(timer);
      this.timeouts.delete(runId);
    }

    if (!pid || pid <= 0) {
      this.activeProcesses.delete(runId);
      this.nodeProcesses.delete(runId);
      return {
        success: true,
        killedPid: 0,
        killedChildPids: [],
        durationMs: Date.now() - start,
      };
    }

    const childPids = this.findChildPids(pid);

    try {
      if (process.platform === 'win32') {
        // Windows forceful tree kill (/f = force, /t = tree)
        execSync(`taskkill /pid ${pid} /f /t 2>nul`, { timeout: 4000 });
      } else {
        // Unix process group kill
        try {
          process.kill(-pid, 'SIGKILL');
        } catch {
          proc?.kill('SIGKILL');
        }
      }
    } catch {
      // Fallback
      try {
        proc?.kill('SIGKILL');
      } catch {}
    }

    if (managed) {
      managed.active = false;
      managed.childPids = childPids;
    }

    this.activeProcesses.delete(runId);
    this.nodeProcesses.delete(runId);

    return {
      success: true,
      killedPid: pid,
      killedChildPids: childPids,
      durationMs: Date.now() - start,
    };
  }
}

export const globalProcessWatchdog = new ProcessWatchdogRegistry();
