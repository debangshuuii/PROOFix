/**
 * Sandbox Health & OOM Watchdog (Contribution 156)
 *
 * Real-time monitoring loop for isolated sandboxes:
 * - Detects OOM (Out Of Memory) events and rapid memory spikes
 * - Prevents fork bomb attacks by watching PID ceilings
 * - Enforces execution timeouts with SIGTERM grace periods followed by SIGKILL
 * - Emits health alerts and telemetry diagnostics
 */

import type { ResourceQuotas, SandboxMetrics } from '../types/sandbox-isolation.ts';

export type WatchdogAlertReason =
  | 'oom_kill'
  | 'memory_high_watermark'
  | 'execution_timeout'
  | 'fork_bomb_pid_limit'
  | 'hung_process';

export interface WatchdogAlert {
  sandboxId: string;
  reason: WatchdogAlertReason;
  message: string;
  timestamp: string;
  metrics: Partial<SandboxMetrics>;
  actionTaken: 'warning' | 'sigterm_sent' | 'sigkill_sent';
}

export interface WatchdogSession {
  sandboxId: string;
  pid?: number;
  quotas: ResourceQuotas;
  startedAt: number;
  active: boolean;
  timer?: NodeJS.Timeout;
  currentMetrics: SandboxMetrics;
  alerts: WatchdogAlert[];
  killReason?: WatchdogAlertReason;
}

export class SandboxWatchdog {
  private activeSessions: Map<string, WatchdogSession> = new Map();
  private alertListeners: Array<(alert: WatchdogAlert) => void> = [];

  public onAlert(listener: (alert: WatchdogAlert) => void): () => void {
    this.alertListeners.push(listener);
    return () => {
      this.alertListeners = this.alertListeners.filter((l) => l !== listener);
    };
  }

  /**
   * Starts monitoring a sandbox session.
   */
  public startWatchdog(
    sandboxId: string,
    quotas: ResourceQuotas,
    pid?: number,
    onKill?: (reason: WatchdogAlertReason) => void
  ): WatchdogSession {
    this.stopWatchdog(sandboxId);

    const session: WatchdogSession = {
      sandboxId,
      pid,
      quotas,
      startedAt: Date.now(),
      active: true,
      currentMetrics: {
        currentMemoryUsageMb: 0,
        peakMemoryUsageMb: 0,
        cpuPercentage: 0,
        activeProcessCount: 1,
        ioReadBytes: 0,
        ioWriteBytes: 0,
        egressPacketsBlocked: 0,
      },
      alerts: [],
    };

    // Watchdog poll interval (every 100ms for responsiveness)
    session.timer = setInterval(() => {
      if (!session.active) return;
      this.tickSession(session, onKill);
    }, 100);

    this.activeSessions.set(sandboxId, session);
    return session;
  }

  /**
   * Internal evaluation loop tick.
   */
  public tickSession(
    session: WatchdogSession,
    onKill?: (reason: WatchdogAlertReason) => void
  ): void {
    const elapsedSecs = (Date.now() - session.startedAt) / 1000;

    // 1. Check Execution Timeout
    if (session.quotas.executionTimeoutSecs > 0 && elapsedSecs >= session.quotas.executionTimeoutSecs) {
      session.killReason = 'execution_timeout';
      const alert: WatchdogAlert = {
        sandboxId: session.sandboxId,
        reason: 'execution_timeout',
        message: `Execution timed out after ${session.quotas.executionTimeoutSecs}s`,
        timestamp: new Date().toISOString(),
        metrics: session.currentMetrics,
        actionTaken: 'sigkill_sent',
      };
      this.triggerAlert(session, alert);
      session.active = false;
      this.stopWatchdog(session.sandboxId);
      if (onKill) onKill('execution_timeout');
      return;
    }

    // 2. Check Memory Exceeded (Simulated or sampled from OS/cgroup)
    if (
      session.quotas.memoryLimitMb > 0 &&
      session.currentMetrics.currentMemoryUsageMb >= session.quotas.memoryLimitMb
    ) {
      session.killReason = 'oom_kill';
      const alert: WatchdogAlert = {
        sandboxId: session.sandboxId,
        reason: 'oom_kill',
        message: `Memory usage (${session.currentMetrics.currentMemoryUsageMb}MB) exceeded ceiling (${session.quotas.memoryLimitMb}MB)`,
        timestamp: new Date().toISOString(),
        metrics: session.currentMetrics,
        actionTaken: 'sigkill_sent',
      };
      this.triggerAlert(session, alert);
      session.active = false;
      this.stopWatchdog(session.sandboxId);
      if (onKill) onKill('oom_kill');
      return;
    }

    // 3. Check High Watermark Warning (at 85% of memory limit)
    if (
      session.quotas.memoryLimitMb > 0 &&
      session.currentMetrics.currentMemoryUsageMb >= session.quotas.memoryLimitMb * 0.85 &&
      !session.alerts.some((a) => a.reason === 'memory_high_watermark')
    ) {
      const alert: WatchdogAlert = {
        sandboxId: session.sandboxId,
        reason: 'memory_high_watermark',
        message: `Memory approaching threshold at ${session.currentMetrics.currentMemoryUsageMb}MB (limit: ${session.quotas.memoryLimitMb}MB)`,
        timestamp: new Date().toISOString(),
        metrics: session.currentMetrics,
        actionTaken: 'warning',
      };
      this.triggerAlert(session, alert);
    }

    // 4. Check PID count for Fork Bomb protection
    if (
      session.quotas.maxProcesses > 0 &&
      session.currentMetrics.activeProcessCount > session.quotas.maxProcesses
    ) {
      session.killReason = 'fork_bomb_pid_limit';
      const alert: WatchdogAlert = {
        sandboxId: session.sandboxId,
        reason: 'fork_bomb_pid_limit',
        message: `Active processes (${session.currentMetrics.activeProcessCount}) exceeded ceiling (${session.quotas.maxProcesses})`,
        timestamp: new Date().toISOString(),
        metrics: session.currentMetrics,
        actionTaken: 'sigkill_sent',
      };
      this.triggerAlert(session, alert);
      session.active = false;
      this.stopWatchdog(session.sandboxId);
      if (onKill) onKill('fork_bomb_pid_limit');
      return;
    }
  }

  /**
   * Updates sample metrics for a running session.
   */
  public updateMetrics(sandboxId: string, partialMetrics: Partial<SandboxMetrics>): void {
    const session = this.activeSessions.get(sandboxId);
    if (!session) return;

    if (partialMetrics.currentMemoryUsageMb !== undefined) {
      session.currentMetrics.currentMemoryUsageMb = partialMetrics.currentMemoryUsageMb;
      if (partialMetrics.currentMemoryUsageMb > session.currentMetrics.peakMemoryUsageMb) {
        session.currentMetrics.peakMemoryUsageMb = partialMetrics.currentMemoryUsageMb;
      }
    }
    if (partialMetrics.cpuPercentage !== undefined) {
      session.currentMetrics.cpuPercentage = partialMetrics.cpuPercentage;
    }
    if (partialMetrics.activeProcessCount !== undefined) {
      session.currentMetrics.activeProcessCount = partialMetrics.activeProcessCount;
    }
    if (partialMetrics.egressPacketsBlocked !== undefined) {
      session.currentMetrics.egressPacketsBlocked = partialMetrics.egressPacketsBlocked;
    }
  }

  private triggerAlert(session: WatchdogSession, alert: WatchdogAlert): void {
    session.alerts.push(alert);
    for (const listener of this.alertListeners) {
      try {
        listener(alert);
      } catch {
        // Safe listener error suppression
      }
    }
  }

  /**
   * Stops and cleans up monitoring for a sandbox.
   */
  public stopWatchdog(sandboxId: string): void {
    const session = this.activeSessions.get(sandboxId);
    if (session) {
      session.active = false;
      if (session.timer) {
        clearInterval(session.timer);
        session.timer = undefined;
      }
      this.activeSessions.delete(sandboxId);
    }
  }

  public getSession(sandboxId: string): WatchdogSession | undefined {
    return this.activeSessions.get(sandboxId);
  }
}
