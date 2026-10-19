export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  backoffFactor?: number;
  maxDelayMs?: number;
  onRetry?: (error: any, attempt: number, nextDelayMs: number) => void;
}

const TRANSIENT_ERROR_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'EAI_AGAIN',
  'ENOTFOUND',
  'EHOSTUNREACH',
]);

const TRANSIENT_HTTP_STATUSES = new Set([429, 500, 502, 503, 504]);

/**
 * Determines whether an error is transient (temporary network/service glitch) or permanent.
 */
export function isTransientError(error: any): boolean {
  if (!error) return false;

  // Check Node system error code
  if (error.code && TRANSIENT_ERROR_CODES.has(error.code)) {
    return true;
  }

  // Check HTTP status code
  const status = error.status || error.statusCode || error.response?.status;
  if (status && TRANSIENT_HTTP_STATUSES.has(status)) {
    return true;
  }

  // Check message indicators
  const msg = (error.message || '').toLowerCase();
  if (
    msg.includes('rate limit') ||
    msg.includes('econnrefused') ||
    msg.includes('etimedout') ||
    msg.includes('connection reset') ||
    msg.includes('network error') ||
    msg.includes('socket hang up') ||
    msg.includes('server unavailable')
  ) {
    return true;
  }

  // Permanent errors: Auth, 404, Syntax, Schema, Validation
  if (
    status === 401 ||
    status === 403 ||
    status === 404 ||
    status === 400 ||
    error.name === 'ValidationError' ||
    msg.includes('unauthorized') ||
    msg.includes('forbidden') ||
    msg.includes('invalid schema')
  ) {
    return false;
  }

  return false;
}

/**
 * Retries an asynchronous operation with bounded exponential backoff.
 * Permanent errors abort immediately without retrying.
 */
export async function retryOperation<T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxRetries = Math.min(5, Math.max(0, options.maxRetries ?? 2));
  let delay = options.initialDelayMs ?? 100;
  const backoff = options.backoffFactor ?? 2;
  const maxDelay = options.maxDelayMs ?? 5000;

  let lastError: any = null;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await operation(attempt);
    } catch (err: any) {
      lastError = err;

      // Fail immediately on permanent errors or when retries are exhausted
      if (!isTransientError(err) || attempt > maxRetries) {
        throw err;
      }

      if (options.onRetry) {
        options.onRetry(err, attempt, delay);
      }

      // Wait before next retry
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(maxDelay, delay * backoff);
    }
  }

  throw lastError;
}

/**
 * Wraps a promise with an enforced timeout that aborts execution promptly.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string = 'Operation'
): Promise<T> {
  let timer: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const err: any = new Error(
        `Timeout: ${operationName} exceeded maximum execution limit of ${timeoutMs}ms.`
      );
      err.code = 'ETIMEDOUT';
      reject(err);
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timer);
  });
}
