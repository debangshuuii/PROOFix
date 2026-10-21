/**
 * HTTP/HTTPS Outbound Network Proxy & Interceptor Bridge (Contribution 146)
 */

import type {
  TrafficCassette,
  ReplayMode,
  ReplaySessionStats,
  RecordedRequest,
  RecordedResponse,
  FaultInjectionRule,
  MatchStrategy,
} from '../types/mock-replay.ts';
import { normalizeRequest, scrubRequestAndResponse } from './request-normalizer.ts';
import { InteractionMatcher } from './interaction-matcher.ts';
import { FaultInjector } from './fault-injector.ts';
import { recordInteraction, inferProvider } from './cassette-storage.ts';

export interface InterceptorOptions {
  mode: ReplayMode;
  cassetteName?: string;
  cassette?: TrafficCassette;
  matchStrategy?: MatchStrategy;
  faultRules?: FaultInjectionRule[];
  allowedUnmatchedCalls?: boolean;
  baseFetch?: typeof fetch;
}

export class NetworkInterceptor {
  private mode: ReplayMode;
  private cassetteName: string;
  private cassette?: TrafficCassette;
  private matchStrategy: MatchStrategy;
  private allowedUnmatchedCalls: boolean;
  private baseFetch: typeof fetch;

  private matcher: InteractionMatcher;
  private faultInjector: FaultInjector;
  private originalGlobalFetch?: typeof fetch;

  private stats: ReplaySessionStats = {
    mode: 'replay',
    totalRequestsIntercepted: 0,
    cassetteHits: 0,
    cassetteMisses: 0,
    recordedNew: 0,
    faultsInjected: 0,
    simulatedDelayTotalMs: 0,
  };

  constructor(options: InterceptorOptions) {
    this.mode = options.mode;
    this.stats.mode = options.mode;
    this.cassetteName = options.cassetteName || 'default_cassette';
    this.cassette = options.cassette;
    this.matchStrategy = options.matchStrategy || 'exact';
    this.allowedUnmatchedCalls = options.allowedUnmatchedCalls ?? false;
    this.baseFetch = options.baseFetch || globalThis.fetch;

    this.matcher = new InteractionMatcher();
    this.faultInjector = new FaultInjector(options.faultRules || []);
  }

  public setCassette(cassette: TrafficCassette): void {
    this.cassette = cassette;
    this.cassetteName = cassette.name;
    this.matcher.reset();
  }

  public setMode(mode: ReplayMode): void {
    this.mode = mode;
    this.stats.mode = mode;
  }

  public addFaultRule(rule: FaultInjectionRule): void {
    this.faultInjector.addRule(rule);
  }

  public getStats(): ReplaySessionStats {
    return { ...this.stats };
  }

  /**
   * Intercepts an outbound request and decides whether to replay, record, or pass through.
   */
  public async handleRequest(
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    this.stats.totalRequestsIntercepted++;

    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const method = init?.method || (typeof input === 'object' && 'method' in input ? input.method : 'GET') || 'GET';

    // Extract headers
    const headers: Record<string, string> = {};
    if (init?.headers) {
      if (init.headers instanceof Headers) {
        init.headers.forEach((v, k) => { headers[k] = v; });
      } else if (Array.isArray(init.headers)) {
        for (const [k, v] of init.headers) { headers[k] = v; }
      } else {
        Object.assign(headers, init.headers);
      }
    }

    // Extract body
    let bodyString: string | undefined;
    if (init?.body) {
      if (typeof init.body === 'string') {
        bodyString = init.body;
      } else if (init.body instanceof URLSearchParams) {
        bodyString = init.body.toString();
      }
    }

    const normalizedReq = normalizeRequest({
      method,
      url,
      headers,
      body: bodyString,
    });

    const provider = inferProvider(url);

    // 1. PASSTHROUGH MODE: evaluate fault injection then pass through
    if (this.mode === 'passthrough') {
      const faultResult = await this.faultInjector.evaluateFault(normalizedReq, undefined, provider);
      if (faultResult.intercepted) {
        this.stats.faultsInjected++;
        this.stats.simulatedDelayTotalMs += faultResult.delayAppliedMs;
        if (faultResult.errorToThrow) throw faultResult.errorToThrow;
        if (faultResult.modifiedResponse) {
          return this.convertRecordedToFetchResponse(faultResult.modifiedResponse);
        }
      }
      return this.baseFetch(input, init);
    }

    // 2. REPLAY MODE (or AUTO mode with matching interaction)
    if (this.mode === 'replay' || this.mode === 'auto') {
      if (this.cassette) {
        const matchResult = this.matcher.match(normalizedReq, this.cassette, this.matchStrategy);

        if (matchResult.matched) {
          this.stats.cassetteHits++;

          // Evaluate fault rules over matched response
          const fault = await this.faultInjector.evaluateFault(
            normalizedReq,
            matchResult.matched.response,
            provider
          );

          if (fault.intercepted) {
            this.stats.faultsInjected++;
            this.stats.simulatedDelayTotalMs += fault.delayAppliedMs;
            if (fault.errorToThrow) throw fault.errorToThrow;
            if (fault.modifiedResponse) {
              return this.convertRecordedToFetchResponse(fault.modifiedResponse);
            }
          }

          return this.convertRecordedToFetchResponse(matchResult.matched.response);
        }
      }

      this.stats.cassetteMisses++;

      // If in strict replay mode and no match, throw error or return 500
      if (this.mode === 'replay' && !this.allowedUnmatchedCalls) {
        throw new Error(
          `[PROOFix Replay Error] Unmatched outbound network call: ${method} ${url}. Real network calls blocked in strict deterministic replay mode.`
        );
      }
    }

    // 3. RECORD MODE (or AUTO mode cache miss): execute live request, scrub secrets, and persist
    const startTime = performance.now();
    const liveResponse = await this.baseFetch(input, init);
    const durationMs = Math.round(performance.now() - startTime);

    const cloned = liveResponse.clone();
    const resBody = await cloned.text();

    const resHeaders: Record<string, string> = {};
    cloned.headers.forEach((v, k) => { resHeaders[k] = v; });

    const rawResponse: RecordedResponse = {
      statusCode: cloned.status,
      statusText: cloned.statusText,
      headers: resHeaders,
      body: resBody,
      durationMs,
    };

    // Scrub secrets before storing
    const { req: cleanReq, res: cleanRes } = scrubRequestAndResponse(normalizedReq, rawResponse);

    try {
      this.cassette = await recordInteraction(this.cassetteName, {
        request: cleanReq,
        response: cleanRes,
        provider,
      });
      this.stats.recordedNew++;
    } catch {}

    return liveResponse;
  }

  /**
   * Converts a RecordedResponse into a standard web Response object.
   */
  private convertRecordedToFetchResponse(recorded: RecordedResponse): Response {
    const headers = new Headers();
    for (const [k, v] of Object.entries(recorded.headers)) {
      headers.set(k, v);
    }

    return new Response(recorded.body, {
      status: recorded.statusCode,
      statusText: recorded.statusText,
      headers,
    });
  }

  /**
   * Returns a custom wrapped `fetch` function that intercepts requests.
   */
  public getFetch(): typeof fetch {
    return (input: RequestInfo | URL, init?: RequestInit) => {
      return this.handleRequest(input, init);
    };
  }

  /**
   * Installs this interceptor as globalThis.fetch.
   */
  public installGlobalFetch(): void {
    if (!this.originalGlobalFetch) {
      this.originalGlobalFetch = globalThis.fetch;
      globalThis.fetch = this.getFetch();
    }
  }

  /**
   * Restores the original globalThis.fetch.
   */
  public restoreGlobalFetch(): void {
    if (this.originalGlobalFetch) {
      globalThis.fetch = this.originalGlobalFetch;
      this.originalGlobalFetch = undefined;
    }
  }
}
