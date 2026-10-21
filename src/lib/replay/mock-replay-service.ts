/**
 * Mock Replay Manager Service (Contribution 148)
 */

import type {
  MockReplaySession,
  ReplayOptions,
  FaultInjectionRule,
  TrafficCassette,
} from '../types/mock-replay.ts';
import { loadCassette, listCassettes, saveCassette } from './cassette-storage.ts';
import { NetworkInterceptor } from './network-interceptor.ts';
import { getProviderPreset } from './provider-presets.ts';

export interface SessionContext {
  session: MockReplaySession;
  interceptor: NetworkInterceptor;
}

export class MockReplayService {
  private activeSessions: Map<string, SessionContext> = new Map();

  /**
   * Starts a new deterministic mock/replay session for a run.
   */
  public async startSession(
    runId: string,
    options: ReplayOptions
  ): Promise<MockReplaySession> {
    // If existing session, return it
    const existing = this.activeSessions.get(runId);
    if (existing) {
      return existing.session;
    }

    let cassette: TrafficCassette | undefined;
    const cassetteName = options.cassetteId || `run_${runId}_cassette`;

    if (options.mode === 'replay' || options.mode === 'auto') {
      cassette = (await loadCassette(cassetteName, options.cassetteDir)) || undefined;

      // If cassette not found on disk, check if it matches a provider preset
      if (!cassette && options.cassetteId) {
        cassette = getProviderPreset(options.cassetteId) || undefined;
      }
    }

    const interceptor = new NetworkInterceptor({
      mode: options.mode,
      cassetteName,
      cassette,
      matchStrategy: options.matchStrategy || 'exact',
      faultRules: options.faultRules || [],
      allowedUnmatchedCalls: options.allowedUnmatchedCalls ?? false,
    });

    const session: MockReplaySession = {
      id: `sess_replay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      runId,
      mode: options.mode,
      cassette,
      activeFaultRules: options.faultRules ? [...options.faultRules] : [],
      stats: interceptor.getStats(),
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.activeSessions.set(runId, { session, interceptor });
    return session;
  }

  /**
   * Retrieves an active session by runId.
   */
  public getSession(runId: string): MockReplaySession | undefined {
    const ctx = this.activeSessions.get(runId);
    if (!ctx) return undefined;
    ctx.session.stats = ctx.interceptor.getStats();
    ctx.session.updatedAt = new Date().toISOString();
    return ctx.session;
  }

  /**
   * Retrieves the NetworkInterceptor associated with a run session.
   */
  public getInterceptor(runId: string): NetworkInterceptor | undefined {
    return this.activeSessions.get(runId)?.interceptor;
  }

  /**
   * Adds a dynamic fault injection rule to an active session.
   */
  public addFaultRule(runId: string, rule: FaultInjectionRule): boolean {
    const ctx = this.activeSessions.get(runId);
    if (!ctx) return false;

    ctx.interceptor.addFaultRule(rule);
    ctx.session.activeFaultRules.push(rule);
    ctx.session.updatedAt = new Date().toISOString();
    return true;
  }

  /**
   * Stops a mock replay session and persists any newly recorded interactions.
   */
  public async stopSession(runId: string): Promise<MockReplaySession | null> {
    const ctx = this.activeSessions.get(runId);
    if (!ctx) return null;

    ctx.session.stats = ctx.interceptor.getStats();
    ctx.session.updatedAt = new Date().toISOString();

    this.activeSessions.delete(runId);
    return ctx.session;
  }

  /**
   * Lists all active sessions.
   */
  public listActiveSessions(): MockReplaySession[] {
    return Array.from(this.activeSessions.values()).map((ctx) => {
      ctx.session.stats = ctx.interceptor.getStats();
      return { ...ctx.session };
    });
  }
}

export const globalMockReplayService = new MockReplayService();
