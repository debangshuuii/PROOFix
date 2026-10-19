export const EXIT_SUCCESS = 0;
export const EXIT_VERIFICATION_FAILURE = 1;
export const EXIT_EXECUTION_ERROR = 2;

export type ActionExitCode =
  | typeof EXIT_SUCCESS
  | typeof EXIT_VERIFICATION_FAILURE
  | typeof EXIT_EXECUTION_ERROR;

export interface ExitCodeDeterminationParams {
  status: 'passed' | 'failed' | 'error';
  failedChecks: number;
  failOnRegression: boolean;
  hasExecutionError?: boolean;
}

/**
 * Maps verification run telemetry to standard GitHub Action process exit codes.
 *
 * Guaranteed Invariant: Failed checks CANNOT accidentally produce exit code 0
 * when failOnRegression is true.
 */
export function determineActionExitCode(params: ExitCodeDeterminationParams): ActionExitCode {
  // 1. Any runtime crash, process abort, or configuration error maps to 2
  if (params.status === 'error' || params.hasExecutionError) {
    return EXIT_EXECUTION_ERROR;
  }

  // 2. Failed checks trigger verification failure exit code 1 if failOnRegression is active
  if (params.failedChecks > 0 || params.status === 'failed') {
    if (params.failOnRegression) {
      return EXIT_VERIFICATION_FAILURE;
    }
    // If explicitly configured to not fail the build on regressions, return 0 (advisory mode)
    return EXIT_SUCCESS;
  }

  // 3. Otherwise completely passed
  return EXIT_SUCCESS;
}

/**
 * Returns human-readable diagnostic metadata for an exit code.
 */
export function describeExitCode(code: ActionExitCode): {
  code: number;
  name: string;
  description: string;
} {
  switch (code) {
    case EXIT_SUCCESS:
      return {
        code: 0,
        name: 'SUCCESS',
        description: 'All evaluated verification checks passed cleanly without regressions.',
      };
    case EXIT_VERIFICATION_FAILURE:
      return {
        code: 1,
        name: 'VERIFICATION_FAILURE',
        description: 'One or more test checks or visual regressions failed the verification criteria.',
      };
    case EXIT_EXECUTION_ERROR:
      return {
        code: 2,
        name: 'EXECUTION_ERROR',
        description: 'Action execution aborted due to invalid configuration, unhandled exception, or timeout.',
      };
    default:
      return {
        code,
        name: 'UNKNOWN',
        description: 'Unrecognized exit status.',
      };
  }
}
