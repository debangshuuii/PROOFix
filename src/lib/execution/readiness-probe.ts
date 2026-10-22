/**
 * Adaptive Readiness Probe Engine
 * Performs intelligent HTTP polling with exponential backoff and jitter
 * to verify web application server availability before launching browser tests.
 */

import http from 'http';
import https from 'https';
import type {
  ReadinessProbeOptions,
  ReadinessProbeResult,
} from '../types/execution.ts';

export const DEFAULT_PROBE_OPTIONS: ReadinessProbeOptions = {
  host: 'localhost',
  port: 3000,
  path: '/',
  timeoutMs: 30000,
  pollIntervalMs: 800,
  expectedStatusMin: 200,
  expectedStatusMax: 399,
};

/**
 * Executes a single low-overhead HTTP probe request.
 */
function probeHttpEndpoint(
  host: string,
  port: number,
  requestPath: string,
  headers: Record<string, string> = {}
): Promise<{ statusCode: number; responseTimeMs: number }> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const req = http.request(
      {
        hostname: host,
        port,
        path: requestPath.startsWith('/') ? requestPath : `/${requestPath}`,
        method: 'GET',
        headers: {
          'User-Agent': 'PROOFix-Readiness-Probe/1.0',
          Accept: '*/*',
          ...headers,
        },
        timeout: 2500,
      },
      (res) => {
        // Drain incoming stream to release socket
        res.resume();
        resolve({
          statusCode: res.statusCode || 0,
          responseTimeMs: Date.now() - start,
        });
      }
    );

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Connection timed out'));
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.end();
  });
}

/**
 * Polls the target server until it responds with an acceptable HTTP status or times out.
 */
export async function awaitServerReadiness(
  options: Partial<ReadinessProbeOptions>
): Promise<ReadinessProbeResult> {
  const config: ReadinessProbeOptions = {
    ...DEFAULT_PROBE_OPTIONS,
    ...options,
  };

  const startTime = Date.now();
  let attempts = 0;
  let lastError: string | undefined;
  let currentDelay = config.pollIntervalMs || 800;

  while (Date.now() - startTime < config.timeoutMs) {
    attempts++;
    try {
      const probe = await probeHttpEndpoint(
        config.host || 'localhost',
        config.port,
        config.path,
        config.headers
      );

      const minStatus = config.expectedStatusMin ?? 200;
      const maxStatus = config.expectedStatusMax ?? 399;

      // Status 200..399 or 404/401/403 (server process is responding!)
      if (probe.statusCode >= minStatus && probe.statusCode <= maxStatus) {
        return {
          ready: true,
          statusCode: probe.statusCode,
          responseTimeMs: probe.responseTimeMs,
          attempts,
        };
      }

      // If server returns 404 or 500, it's alive and listening to HTTP
      if (probe.statusCode > 0 && probe.statusCode < 600) {
        return {
          ready: true,
          statusCode: probe.statusCode,
          responseTimeMs: probe.responseTimeMs,
          attempts,
        };
      }
    } catch (err: any) {
      lastError = err?.message || 'Server not responding';
    }

    // Adaptive backoff with slight jitter to prevent socket stampedes
    const jitter = Math.floor(Math.random() * 150);
    await new Promise((r) => setTimeout(r, currentDelay + jitter));
    currentDelay = Math.min(currentDelay * 1.25, 2000);
  }

  return {
    ready: false,
    attempts,
    responseTimeMs: Date.now() - startTime,
    errorMessage: `Server on ${config.host}:${config.port}${config.path} failed readiness probe within ${config.timeoutMs}ms. Last error: ${lastError}`,
  };
}
