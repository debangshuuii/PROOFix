/**
 * Mock Service & Deterministic Third-Party Replay Types (Contribution 141)
 */

export type ReplayMode = 'record' | 'replay' | 'passthrough' | 'auto';

export type MatchStrategy = 'exact' | 'path_and_method' | 'body_hash' | 'fuzzy_json';

export type FaultType =
  | 'delay_latency'
  | 'http_status_override'
  | 'rate_limit_429'
  | 'connection_reset'
  | 'timeout'
  | 'corrupted_json'
  | 'empty_response';

export interface RecordedRequest {
  method: string;
  url: string;
  path: string;
  queryParams: Record<string, string>;
  headers: Record<string, string>;
  body?: string;
  bodyHash?: string;
  timestamp: string;
}

export interface RecordedResponse {
  statusCode: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  durationMs: number;
  isBase64?: boolean;
}

export interface CassetteInteraction {
  id: string;
  order: number;
  provider?: string; // e.g. "stripe", "github", "openai", "custom"
  request: RecordedRequest;
  response: RecordedResponse;
  timesReplayed?: number;
  createdAt: string;
}

export interface TrafficCassette {
  id: string;
  name: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  scope: string; // runId or testName
  interactions: CassetteInteraction[];
  metadata?: {
    recordedBy?: string;
    totalInteractions: number;
    providers: string[];
    scrubbedSecretsCount: number;
  };
}

export interface FaultInjectionRule {
  id: string;
  name: string;
  enabled: boolean;
  targetProvider?: string;
  urlPattern?: string; // regex or glob
  method?: string;
  faultType: FaultType;
  params: {
    delayMs?: number;
    statusCode?: number;
    statusText?: string;
    errorMessage?: string;
    retryAfterSecs?: number;
    dropPercentage?: number; // 0 to 100
  };
}

export interface ReplayOptions {
  cassetteId?: string;
  mode: ReplayMode;
  cassetteDir?: string;
  matchStrategy?: MatchStrategy;
  allowedUnmatchedCalls?: boolean;
  scrubSecrets?: boolean;
  faultRules?: FaultInjectionRule[];
}

export interface ReplaySessionStats {
  mode: ReplayMode;
  totalRequestsIntercepted: number;
  cassetteHits: number;
  cassetteMisses: number;
  recordedNew: number;
  faultsInjected: number;
  simulatedDelayTotalMs: number;
}

export interface MockReplaySession {
  id: string;
  runId: string;
  mode: ReplayMode;
  cassette?: TrafficCassette;
  activeFaultRules: FaultInjectionRule[];
  stats: ReplaySessionStats;
  startedAt: string;
  updatedAt: string;
}
