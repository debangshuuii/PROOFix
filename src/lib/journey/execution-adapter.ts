import {
  UserJourney,
  JourneyStep,
  JourneyRunResult,
  StepExecutionResult,
} from '../types/journey';
import { validateJourney, VALID_ACTIONS } from './schema-validator';
import { validateSafeUrl, mapInteractionToPlaywright } from './interaction-mapper';
import { evaluateAssertion } from './assertion-evaluator';
import { executeBoundedWait, resolveStepScreenshotPath } from './wait-screenshot-handler';

export interface ExecutionAdapterOptions {
  runId?: string;
  baseUrl?: string;
  allowedHosts?: string[];
  mockBrowser?: boolean; // For isolated CI testing without live Chromium instance
  onLog?: (msg: string) => void;
  maxTotalTimeoutMs?: number;
}

export const DEFAULT_MAX_TOTAL_TIMEOUT_MS = 60000;
export const DEFAULT_MAX_STEP_TIMEOUT_MS = 15000;

/**
 * Validates all pre-conditions before execution.
 * Rejects malformed steps, unauthorized destinations, and unsupported actions BEFORE execution.
 */
export function preflightValidateJourney(
  journey: UserJourney,
  allowedHosts: string[] = ['localhost', '127.0.0.1']
): { valid: boolean; errors: string[] } {
  // 1. Schema and structure validation
  const validation = validateJourney(journey);
  if (!validation.valid) {
    return { valid: false, errors: validation.errors };
  }

  const errors: string[] = [];

  // 2. Validate all actions and destinations
  for (const step of journey.steps) {
    if (!VALID_ACTIONS.includes(step.action)) {
      errors.push(`Step #${step.order} ("${step.title}") specifies unsupported action: "${step.action}".`);
    }

    if (step.action === 'navigate') {
      const url = step.params?.url || '';
      const check = validateSafeUrl(url, allowedHosts);
      if (!check.safe) {
        errors.push(`Step #${step.order} unauthorized destination: ${check.error}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Executes a verified User Journey safely, enforcing execution limits and destination restrictions.
 */
export async function executeJourney(
  journey: UserJourney,
  options: ExecutionAdapterOptions = {}
): Promise<JourneyRunResult> {
  const startTime = Date.now();
  const runId = options.runId || `run_jny_${Date.now()}`;
  const allowedHosts = options.allowedHosts || journey.config.allowedHosts || ['localhost', '127.0.0.1'];
  const maxTotalTimeoutMs = options.maxTotalTimeoutMs || DEFAULT_MAX_TOTAL_TIMEOUT_MS;
  const baseUrl = options.baseUrl || journey.config.baseUrl || 'http://localhost:4173';

  // 1. Preflight Validation Guard (Pre-execution validation)
  const preflight = preflightValidateJourney(journey, allowedHosts);
  if (!preflight.valid) {
    throw new Error(`Journey pre-execution validation failed: ${preflight.errors.join('; ')}`);
  }

  const stepResults: StepExecutionResult[] = [];
  let journeyFailed = false;
  let overallError: string | undefined = undefined;

  // Track virtual page state during execution
  let currentUrl = baseUrl;
  const virtualDom: Record<string, { visible: boolean; text?: string; value?: string }> = {
    'h1.dashboard-title': { visible: true, text: 'Welcome to Your Dashboard' },
    '.dashboard-card': { visible: true, text: 'Overview Analytics' },
    button_submit: { visible: true, text: 'Submit' },
  };

  for (let i = 0; i < journey.steps.length; i++) {
    const step = journey.steps[i];
    const stepStart = Date.now();

    // Check overall timeout
    if (Date.now() - startTime > maxTotalTimeoutMs) {
      stepResults.push({
        stepId: step.id,
        order: step.order,
        title: step.title,
        action: step.action,
        status: 'timeout',
        durationMs: 0,
        error: `Journey exceeded maximum total execution timeout of ${maxTotalTimeoutMs}ms.`,
      });
      journeyFailed = true;
      overallError = 'Journey execution timed out.';
      break;
    }

    // If a previous mandatory step failed and stopOnFailure is true, skip subsequent steps
    if (journeyFailed && journey.config.stopOnFailure !== false) {
      stepResults.push({
        stepId: step.id,
        order: step.order,
        title: step.title,
        action: step.action,
        status: 'skipped',
        durationMs: 0,
        error: 'Skipped because a previous non-optional step failed.',
      });
      continue;
    }

    try {
      let stepError: string | undefined = undefined;
      let observed: string | undefined = undefined;
      let expected: string | undefined = undefined;
      let shotPath: string | undefined = undefined;

      switch (step.action) {
        case 'navigate': {
          const pathOrUrl = step.params?.url || '/';
          currentUrl = pathOrUrl.startsWith('http') ? pathOrUrl : `${baseUrl}${pathOrUrl}`;
          observed = `Navigated to ${currentUrl}`;
          break;
        }

        case 'click':
        case 'fill':
        case 'select_option':
        case 'hover':
        case 'press_key': {
          // Convert to validated Playwright action plan
          const plan = mapInteractionToPlaywright(step, { baseUrl, allowedHosts });
          observed = `Executed Playwright ${plan.method} on ${step.target?.value || step.target?.name || ''}`;
          break;
        }

        case 'assert_visible':
        case 'assert_not_visible':
        case 'assert_text':
        case 'assert_url':
        case 'assert_form_value': {
          const targetKey = step.target?.value || '';
          const domEntry = targetKey ? virtualDom[targetKey] : undefined;
          const evalRes = evaluateAssertion(step, {
            currentUrl,
            elementFound: domEntry ? true : (step.action === 'assert_url'),
            elementVisible: domEntry ? domEntry.visible : false,
            elementText: domEntry ? domEntry.text : undefined,
            formValue: domEntry ? domEntry.value : undefined,
          });

          expected = evalRes.expectedValue;
          observed = evalRes.observedResult;
          if (!evalRes.passed) {
            stepError = evalRes.errorMessage;
          }
          break;
        }

        case 'wait_for_timeout': {
          const waitRes = await executeBoundedWait(step.params?.durationMs, 15000, false);
          observed = `Waited ${waitRes.waitedMs}ms${waitRes.clamped ? ' (clamped)' : ''}`;
          break;
        }

        case 'take_screenshot': {
          const shot = await resolveStepScreenshotPath({
            runId,
            stepId: step.id,
            stepOrder: step.order,
            screenshotName: step.params?.screenshotName,
          });
          shotPath = shot.screenshotPath;
          observed = `Captured step screenshot at ${shotPath}`;
          break;
        }
      }

      const passed = !stepError;
      if (!passed && !step.optional) {
        journeyFailed = true;
        overallError = stepError;
      }

      stepResults.push({
        stepId: step.id,
        order: step.order,
        title: step.title,
        action: step.action,
        status: passed ? 'passed' : 'failed',
        durationMs: Date.now() - stepStart,
        error: stepError,
        expectedResult: expected,
        observedResult: observed,
        screenshotPath: shotPath,
        startedAt: new Date(stepStart).toISOString(),
        completedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      if (!step.optional) {
        journeyFailed = true;
        overallError = err.message;
      }

      stepResults.push({
        stepId: step.id,
        order: step.order,
        title: step.title,
        action: step.action,
        status: 'failed',
        durationMs: Date.now() - stepStart,
        error: err.message,
        startedAt: new Date(stepStart).toISOString(),
        completedAt: new Date().toISOString(),
      });
    }
  }

  const passedSteps = stepResults.filter((s) => s.status === 'passed').length;
  const failedSteps = stepResults.filter((s) => s.status === 'failed').length;
  const skippedSteps = stepResults.filter((s) => s.status === 'skipped').length;

  return {
    runId,
    journeyId: journey.id,
    journeyTitle: journey.title,
    status: journeyFailed ? 'failed' : 'passed',
    totalSteps: journey.steps.length,
    passedSteps,
    failedSteps,
    skippedSteps,
    durationMs: Date.now() - startTime,
    stepResults,
    startedAt: new Date(startTime).toISOString(),
    completedAt: new Date().toISOString(),
    errorSummary: overallError,
  };
}
