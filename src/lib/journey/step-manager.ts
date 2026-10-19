import { UserJourney, JourneyStep } from '../types/journey';
import { assertValidJourney } from './schema-validator';

/**
 * Re-indexes all steps in a journey to enforce contiguous 1-indexed sequential ordering.
 */
export function reindexSteps(steps: JourneyStep[]): JourneyStep[] {
  return steps.map((step, index) => ({
    ...step,
    order: index + 1,
  }));
}

/**
 * Adds a new step to a journey at the specified index (or appends if omitted).
 */
export function addStepToJourney(
  journey: UserJourney,
  stepData: Omit<JourneyStep, 'id' | 'order'>,
  insertAtIndex?: number
): UserJourney {
  const newId = `stp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newStep: JourneyStep = {
    ...stepData,
    id: newId,
    order: 0, // Will be reindexed
  };

  const steps = [...journey.steps];
  if (insertAtIndex !== undefined && insertAtIndex >= 0 && insertAtIndex <= steps.length) {
    steps.splice(insertAtIndex, 0, newStep);
  } else {
    steps.push(newStep);
  }

  const updated: UserJourney = {
    ...journey,
    steps: reindexSteps(steps),
    updatedAt: new Date().toISOString(),
  };

  return assertValidJourney(updated);
}

/**
 * Updates an existing step in a journey.
 */
export function updateStepInJourney(
  journey: UserJourney,
  stepId: string,
  patch: Partial<Omit<JourneyStep, 'id' | 'order'>>
): UserJourney {
  let found = false;
  const updatedSteps = journey.steps.map((s) => {
    if (s.id === stepId) {
      found = true;
      return { ...s, ...patch };
    }
    return s;
  });

  if (!found) {
    throw new Error(`Step with ID "${stepId}" not found in journey.`);
  }

  const updated: UserJourney = {
    ...journey,
    steps: reindexSteps(updatedSteps),
    updatedAt: new Date().toISOString(),
  };

  return assertValidJourney(updated);
}

/**
 * Moves a step to a new 1-indexed order position, maintaining contiguous ordering.
 */
export function reorderStepInJourney(
  journey: UserJourney,
  stepId: string,
  targetOrder: number
): UserJourney {
  const fromIndex = journey.steps.findIndex((s) => s.id === stepId);
  if (fromIndex === -1) {
    throw new Error(`Step with ID "${stepId}" not found in journey.`);
  }

  const targetIndex = Math.max(0, Math.min(journey.steps.length - 1, targetOrder - 1));
  if (fromIndex === targetIndex) return journey;

  const steps = [...journey.steps];
  const [moved] = steps.splice(fromIndex, 1);
  steps.splice(targetIndex, 0, moved);

  const updated: UserJourney = {
    ...journey,
    steps: reindexSteps(steps),
    updatedAt: new Date().toISOString(),
  };

  return assertValidJourney(updated);
}

/**
 * Duplicates a step in a journey, placing the duplicate directly after the original.
 */
export function duplicateStepInJourney(
  journey: UserJourney,
  stepId: string
): UserJourney {
  const index = journey.steps.findIndex((s) => s.id === stepId);
  if (index === -1) {
    throw new Error(`Step with ID "${stepId}" not found in journey.`);
  }

  const original = journey.steps[index];
  const clone: JourneyStep = {
    ...JSON.parse(JSON.stringify(original)),
    id: `stp_${Date.now()}_copy`,
    title: `${original.title} (Copy)`,
    order: 0,
  };

  const steps = [...journey.steps];
  steps.splice(index + 1, 0, clone);

  const updated: UserJourney = {
    ...journey,
    steps: reindexSteps(steps),
    updatedAt: new Date().toISOString(),
  };

  return assertValidJourney(updated);
}

/**
 * Deletes a step from a journey, re-indexing remaining steps contiguously.
 */
export function deleteStepFromJourney(
  journey: UserJourney,
  stepId: string
): UserJourney {
  const index = journey.steps.findIndex((s) => s.id === stepId);
  if (index === -1) {
    throw new Error(`Step with ID "${stepId}" not found in journey.`);
  }

  const steps = journey.steps.filter((s) => s.id !== stepId);

  const updated: UserJourney = {
    ...journey,
    steps: reindexSteps(steps),
    updatedAt: new Date().toISOString(),
  };

  return assertValidJourney(updated);
}
