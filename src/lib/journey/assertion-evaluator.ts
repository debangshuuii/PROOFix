import { JourneyStep, StepSelector } from '../types/journey';

export interface AssertionContext {
  currentUrl?: string;
  elementVisible?: boolean;
  elementText?: string;
  formValue?: string;
  elementFound?: boolean;
}

export interface AssertionEvaluationResult {
  passed: boolean;
  stepId: string;
  stepOrder: number;
  stepTitle: string;
  action: string;
  expectedValue: string;
  observedResult: string;
  errorMessage?: string;
}

/**
 * Pure evaluation function for assertions against a given state context.
 * Guarantees that every failed assertion reports the expected value, observed result, and failing step.
 */
export function evaluateAssertion(
  step: JourneyStep,
  context: AssertionContext
): AssertionEvaluationResult {
  const stepId = step.id;
  const stepOrder = step.order;
  const stepTitle = step.title;

  switch (step.action) {
    case 'assert_visible': {
      const isVisible = Boolean(context.elementFound && context.elementVisible);
      const expected = 'Element visible within DOM and viewport';
      const observed = isVisible ? 'Element is visible' : 'Element not visible or not found';

      return {
        passed: isVisible,
        stepId,
        stepOrder,
        stepTitle,
        action: step.action,
        expectedValue: expected,
        observedResult: observed,
        errorMessage: isVisible
          ? undefined
          : `Assertion failed at Step #${stepOrder} ("${stepTitle}"): Expected element "${step.target?.value || ''}" to be visible, but observed: "${observed}".`,
      };
    }

    case 'assert_not_visible': {
      const isHidden = !context.elementFound || !context.elementVisible;
      const expected = 'Element hidden or removed from DOM';
      const observed = isHidden ? 'Element is not visible' : 'Element is still visible in DOM';

      return {
        passed: isHidden,
        stepId,
        stepOrder,
        stepTitle,
        action: step.action,
        expectedValue: expected,
        observedResult: observed,
        errorMessage: isHidden
          ? undefined
          : `Assertion failed at Step #${stepOrder} ("${stepTitle}"): Expected element "${step.target?.value || ''}" to be hidden, but observed: "${observed}".`,
      };
    }

    case 'assert_text': {
      const expected = step.params?.expectedText ?? '';
      const actual = context.elementText ?? '';
      const mode = step.params?.matchMode || 'exact';

      let matches = false;
      if (mode === 'exact') {
        matches = actual.trim() === expected.trim();
      } else {
        matches = actual.toLowerCase().includes(expected.toLowerCase());
      }

      return {
        passed: matches,
        stepId,
        stepOrder,
        stepTitle,
        action: step.action,
        expectedValue: `Text ${mode === 'exact' ? 'equals' : 'contains'} "${expected}"`,
        observedResult: `Found text "${actual}"`,
        errorMessage: matches
          ? undefined
          : `Assertion failed at Step #${stepOrder} ("${stepTitle}"): Expected "${expected}", but observed "${actual}".`,
      };
    }

    case 'assert_url': {
      const expected = step.params?.expectedUrl ?? '';
      const current = context.currentUrl ?? '';
      const matches = current.includes(expected);

      return {
        passed: matches,
        stepId,
        stepOrder,
        stepTitle,
        action: step.action,
        expectedValue: `URL contains "${expected}"`,
        observedResult: `Current URL is "${current}"`,
        errorMessage: matches
          ? undefined
          : `Assertion failed at Step #${stepOrder} ("${stepTitle}"): Expected URL pattern "${expected}", but observed current URL "${current}".`,
      };
    }

    case 'assert_form_value': {
      const expected = step.params?.expectedValue ?? '';
      const actual = context.formValue ?? '';
      const matches = actual === expected;

      return {
        passed: matches,
        stepId,
        stepOrder,
        stepTitle,
        action: step.action,
        expectedValue: `Form value "${expected}"`,
        observedResult: `Form value "${actual}"`,
        errorMessage: matches
          ? undefined
          : `Assertion failed at Step #${stepOrder} ("${stepTitle}"): Expected form value "${expected}", but observed "${actual}".`,
      };
    }

    default:
      throw new Error(`Unsupported assertion action: "${step.action}"`);
  }
}
