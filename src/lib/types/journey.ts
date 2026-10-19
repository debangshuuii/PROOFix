export type JourneySchemaVersion = '1.0.0' | '1.1.0';

export type StepActionType =
  // Navigation
  | 'navigate'
  // Interactions
  | 'click'
  | 'fill'
  | 'select_option'
  | 'hover'
  | 'press_key'
  // Assertions
  | 'assert_visible'
  | 'assert_text'
  | 'assert_url'
  | 'assert_form_value'
  | 'assert_not_visible'
  // Utility & Observability
  | 'wait_for_timeout'
  | 'wait_for_selector'
  | 'take_screenshot';

export type StepSelectorType =
  | 'role_name'
  | 'label'
  | 'placeholder'
  | 'text'
  | 'testid'
  | 'css';

export interface StepSelector {
  type: StepSelectorType;
  value: string;
  role?: string;
  name?: string;
  exact?: boolean;
}

export interface StepParams {
  url?: string;
  value?: string;
  option?: string;
  key?: string;
  expectedText?: string;
  expectedUrl?: string;
  expectedValue?: string;
  matchMode?: 'exact' | 'contains' | 'regex';
  durationMs?: number;
  screenshotName?: string;
  fullPage?: boolean;
}

export interface JourneyStep {
  id: string;
  order: number;
  title: string;
  action: StepActionType;
  target?: StepSelector;
  params?: StepParams;
  timeoutMs?: number;
  optional?: boolean;
  description?: string;
}

export interface JourneyConfig {
  baseUrl?: string;
  allowedHosts?: string[];
  defaultTimeoutMs?: number;
  viewport?: { width: number; height: number };
  stopOnFailure?: boolean;
  takeScreenshotsOnFailure?: boolean;
  maxStepTimeoutMs?: number;
}

export interface UserJourney {
  id: string;
  projectId: string;
  ownerId: string;
  title: string;
  description?: string;
  schemaVersion: JourneySchemaVersion;
  steps: JourneyStep[];
  config: JourneyConfig;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface JourneyValidationResult {
  valid: boolean;
  errors: string[];
  journey?: UserJourney;
}

export type StepExecutionStatus =
  | 'pending'
  | 'running'
  | 'passed'
  | 'failed'
  | 'skipped'
  | 'timeout';

export interface StepExecutionResult {
  stepId: string;
  order: number;
  title: string;
  action: StepActionType;
  status: StepExecutionStatus;
  durationMs: number;
  error?: string;
  observedResult?: string;
  expectedResult?: string;
  screenshotPath?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface JourneyRunResult {
  runId: string;
  journeyId: string;
  journeyTitle: string;
  status: 'passed' | 'failed' | 'timeout' | 'error';
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  skippedSteps: number;
  durationMs: number;
  stepResults: StepExecutionResult[];
  startedAt: string;
  completedAt: string;
  errorSummary?: string;
}
