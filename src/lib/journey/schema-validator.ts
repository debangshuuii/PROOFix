import fs from 'fs';
import {
  UserJourney,
  JourneyStep,
  JourneyValidationResult,
  JourneySchemaVersion,
  StepActionType,
  StepSelectorType,
} from '../types/journey';

export const CURRENT_SCHEMA_VERSION: JourneySchemaVersion = '1.0.0';
export const SUPPORTED_SCHEMA_VERSIONS: JourneySchemaVersion[] = ['1.0.0'];
export const MAX_WAIT_DURATION_MS = 30000;
export const MAX_STEPS_PER_JOURNEY = 100;

export const VALID_ACTIONS: StepActionType[] = [
  'navigate',
  'click',
  'fill',
  'select_option',
  'hover',
  'press_key',
  'assert_visible',
  'assert_text',
  'assert_url',
  'assert_form_value',
  'assert_not_visible',
  'wait_for_timeout',
  'wait_for_selector',
  'take_screenshot',
];

export const VALID_SELECTOR_TYPES: StepSelectorType[] = [
  'role_name',
  'label',
  'placeholder',
  'text',
  'testid',
  'css',
];

/**
 * Validates a User Journey data structure against the versioned journey schema.
 */
export function validateJourney(input: unknown): JourneyValidationResult {
  const errors: string[] = [];

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { valid: false, errors: ['Journey must be a non-null object.'] };
  }

  const raw = input as Record<string, any>;

  // Validate ID
  if (!raw.id || typeof raw.id !== 'string' || raw.id.trim().length === 0) {
    errors.push('Journey "id" is required and must be a non-empty string.');
  }

  // Validate Project ID & Owner ID
  if (!raw.projectId || typeof raw.projectId !== 'string' || raw.projectId.trim().length === 0) {
    errors.push('Journey "projectId" is required.');
  }
  if (!raw.ownerId || typeof raw.ownerId !== 'string' || raw.ownerId.trim().length === 0) {
    errors.push('Journey "ownerId" is required.');
  }

  // Validate Title
  if (!raw.title || typeof raw.title !== 'string' || raw.title.trim().length === 0) {
    errors.push('Journey "title" is required and must be a non-empty string.');
  }

  // Validate Schema Version
  if (!raw.schemaVersion || !SUPPORTED_SCHEMA_VERSIONS.includes(raw.schemaVersion)) {
    errors.push(
      `Unsupported or missing schemaVersion "${raw.schemaVersion}". Supported versions: ${SUPPORTED_SCHEMA_VERSIONS.join(', ')}.`
    );
  }

  // Validate Steps
  if (!Array.isArray(raw.steps)) {
    errors.push('Journey "steps" must be an array.');
  } else if (raw.steps.length > MAX_STEPS_PER_JOURNEY) {
    errors.push(`Journey cannot contain more than ${MAX_STEPS_PER_JOURNEY} steps.`);
  } else {
    // Validate each step
    const stepIds = new Set<string>();

    raw.steps.forEach((step: any, index: number) => {
      const stepIndex = index + 1;
      if (!step || typeof step !== 'object') {
        errors.push(`Step #${stepIndex} must be a valid object.`);
        return;
      }

      // Step ID
      if (!step.id || typeof step.id !== 'string' || step.id.trim().length === 0) {
        errors.push(`Step #${stepIndex} is missing a valid "id".`);
      } else if (stepIds.has(step.id)) {
        errors.push(`Duplicate step ID "${step.id}" detected at step #${stepIndex}.`);
      } else {
        stepIds.add(step.id);
      }

      // Contiguous Order
      if (typeof step.order !== 'number' || step.order !== stepIndex) {
        errors.push(`Step #${stepIndex} has invalid order (${step.order}); expected sequential order ${stepIndex}.`);
      }

      // Step Title
      if (!step.title || typeof step.title !== 'string' || step.title.trim().length === 0) {
        errors.push(`Step #${stepIndex} is missing a descriptive "title".`);
      }

      // Step Action
      if (!step.action || !VALID_ACTIONS.includes(step.action)) {
        errors.push(`Step #${stepIndex} has unsupported action "${step.action}".`);
        return;
      }

      // Action-specific validations
      switch (step.action) {
        case 'navigate':
          if (!step.params?.url || typeof step.params.url !== 'string') {
            errors.push(`Step #${stepIndex} ("navigate") requires "params.url" string.`);
          }
          break;

        case 'click':
        case 'hover':
        case 'assert_visible':
        case 'assert_not_visible':
        case 'wait_for_selector':
          if (!step.target || typeof step.target !== 'object' || !VALID_SELECTOR_TYPES.includes(step.target.type)) {
            errors.push(`Step #${stepIndex} ("${step.action}") requires a valid "target" selector.`);
          }
          break;

        case 'fill':
          if (!step.target || typeof step.target !== 'object' || !VALID_SELECTOR_TYPES.includes(step.target.type)) {
            errors.push(`Step #${stepIndex} ("fill") requires a valid "target" selector.`);
          }
          if (step.params?.value === undefined || typeof step.params.value !== 'string') {
            errors.push(`Step #${stepIndex} ("fill") requires string "params.value".`);
          }
          break;

        case 'select_option':
          if (!step.target || typeof step.target !== 'object') {
            errors.push(`Step #${stepIndex} ("select_option") requires a valid "target" selector.`);
          }
          if (!step.params?.option || typeof step.params.option !== 'string') {
            errors.push(`Step #${stepIndex} ("select_option") requires string "params.option".`);
          }
          break;

        case 'assert_text':
          if (!step.target || typeof step.target !== 'object') {
            errors.push(`Step #${stepIndex} ("assert_text") requires a valid "target" selector.`);
          }
          if (step.params?.expectedText === undefined || typeof step.params.expectedText !== 'string') {
            errors.push(`Step #${stepIndex} ("assert_text") requires string "params.expectedText".`);
          }
          break;

        case 'assert_url':
          if (!step.params?.expectedUrl || typeof step.params.expectedUrl !== 'string') {
            errors.push(`Step #${stepIndex} ("assert_url") requires string "params.expectedUrl".`);
          }
          break;

        case 'wait_for_timeout':
          const ms = step.params?.durationMs;
          if (typeof ms !== 'number' || ms <= 0 || !Number.isInteger(ms)) {
            errors.push(`Step #${stepIndex} ("wait_for_timeout") requires positive integer "params.durationMs".`);
          } else if (ms > MAX_WAIT_DURATION_MS) {
            errors.push(`Step #${stepIndex} wait duration (${ms}ms) exceeds maximum bound of ${MAX_WAIT_DURATION_MS}ms.`);
          }
          break;
      }
    });
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const now = new Date().toISOString();
  const journey: UserJourney = {
    id: String(raw.id).trim(),
    projectId: String(raw.projectId).trim(),
    ownerId: String(raw.ownerId).trim(),
    title: String(raw.title).trim(),
    description: raw.description ? String(raw.description).trim() : undefined,
    schemaVersion: raw.schemaVersion,
    steps: raw.steps as JourneyStep[],
    config: {
      baseUrl: raw.config?.baseUrl,
      allowedHosts: raw.config?.allowedHosts || ['localhost', '127.0.0.1'],
      defaultTimeoutMs: raw.config?.defaultTimeoutMs || 10000,
      viewport: raw.config?.viewport || { width: 1280, height: 720 },
      stopOnFailure: raw.config?.stopOnFailure !== undefined ? Boolean(raw.config.stopOnFailure) : true,
      takeScreenshotsOnFailure: raw.config?.takeScreenshotsOnFailure !== undefined ? Boolean(raw.config.takeScreenshotsOnFailure) : true,
      maxStepTimeoutMs: raw.config?.maxStepTimeoutMs || 15000,
    },
    tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
    createdAt: raw.createdAt || now,
    updatedAt: raw.updatedAt || now,
  };

  return { valid: true, errors: [], journey };
}

/**
 * Asserts a valid journey, throwing an error if invalid.
 */
export function assertValidJourney(input: unknown): UserJourney {
  const result = validateJourney(input);
  if (!result.valid || !result.journey) {
    throw new Error(`Invalid UserJourney: ${result.errors.join('; ')}`);
  }
  return result.journey;
}

/**
 * Serializes a journey to a formatted JSON string.
 */
export function serializeJourney(journey: UserJourney): string {
  const validated = assertValidJourney(journey);
  return JSON.stringify(validated, null, 2);
}

/**
 * Deserializes and validates a journey from JSON string.
 */
export function deserializeJourney(jsonStr: string): UserJourney {
  const parsed = JSON.parse(jsonStr);
  return assertValidJourney(parsed);
}

/**
 * Loads and validates a journey from a disk fixture file.
 */
export function loadJourneyFromFixture(filePath: string): UserJourney {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Journey fixture file not found at path: "${filePath}"`);
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return deserializeJourney(content);
}
