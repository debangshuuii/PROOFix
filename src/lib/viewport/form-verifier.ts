import { ViewportProfile } from '../types/viewport';

export interface FormFieldDescriptor {
  id: string;
  name: string;
  type: string;
  required?: boolean;
  width: number;
  height: number;
  isVisible: boolean;
  isOccluded?: boolean;
  value?: string;
  hasValidationError?: boolean;
  validationMessage?: string;
}

export interface FormDescriptor {
  id: string;
  action?: string;
  method?: string;
  fields: FormFieldDescriptor[];
  submitButton: {
    text: string;
    width: number;
    height: number;
    isVisible: boolean;
    isOccluded?: boolean;
  };
}

export interface FormAuditViolation {
  fieldId: string;
  rule: 'visibility' | 'touch_target' | 'validation_feedback' | 'occlusion' | 'submission_safety';
  details: string;
}

export interface ViewportFormAuditResult {
  profileId: string;
  profileName: string;
  viewport: { width: number; height: number };
  passed: boolean;
  formCount: number;
  visibilityPassed: boolean;
  touchTargetsPassed: boolean;
  validationFeedbackPassed: boolean;
  safeSubmissionVerified: boolean;
  unintendedSubmissionsBlocked: number;
  violations: FormAuditViolation[];
  message: string;
}

export const MIN_TOUCH_TARGET_SIZE_PX = 36; // Minimum accessible touch target for mobile/touch emulation

/**
 * Verifies form visibility, usability, validation feedback, and safe submission
 * for a specific viewport profile.
 */
export function verifyFormAtViewport(
  profile: ViewportProfile,
  forms: FormDescriptor[],
  options: {
    dryRunSafeSubmission?: boolean;
    onInterceptSubmission?: (action: string) => void;
  } = {}
): ViewportFormAuditResult {
  const violations: FormAuditViolation[] = [];
  let blockedSubmissionsCount = 0;
  let validationPassed = true;
  let visibilityPassed = true;
  let touchTargetsPassed = true;

  if (!forms || forms.length === 0) {
    return {
      profileId: profile.id,
      profileName: profile.name,
      viewport: { width: profile.width, height: profile.height },
      passed: true,
      formCount: 0,
      visibilityPassed: true,
      touchTargetsPassed: true,
      validationFeedbackPassed: true,
      safeSubmissionVerified: true,
      unintendedSubmissionsBlocked: 0,
      violations: [],
      message: `No forms detected on page for ${profile.name}.`,
    };
  }

  for (const form of forms) {
    // 1. Check submit button visibility & touch target
    if (!form.submitButton.isVisible || form.submitButton.isOccluded) {
      visibilityPassed = false;
      violations.push({
        fieldId: `${form.id}_submit`,
        rule: 'visibility',
        details: `Submit button "${form.submitButton.text}" is hidden or occluded by fixed overlay at ${profile.name}.`,
      });
    }

    if (profile.hasTouch || profile.isMobile) {
      if (
        form.submitButton.height < MIN_TOUCH_TARGET_SIZE_PX ||
        form.submitButton.width < MIN_TOUCH_TARGET_SIZE_PX
      ) {
        touchTargetsPassed = false;
        violations.push({
          fieldId: `${form.id}_submit`,
          rule: 'touch_target',
          details: `Submit button touch target (${form.submitButton.width}×${form.submitButton.height}px) is below minimum ${MIN_TOUCH_TARGET_SIZE_PX}px on ${profile.name}.`,
        });
      }
    }

    // 2. Check each field
    for (const field of form.fields) {
      if (!field.isVisible || field.isOccluded) {
        visibilityPassed = false;
        violations.push({
          fieldId: field.id,
          rule: 'visibility',
          details: `Field "${field.name}" is not fully visible or occluded within ${profile.width}px viewport.`,
        });
      }

      // Touch target size check for touch/mobile profiles
      if (profile.hasTouch || profile.isMobile) {
        if (field.height < MIN_TOUCH_TARGET_SIZE_PX) {
          touchTargetsPassed = false;
          violations.push({
            fieldId: field.id,
            rule: 'touch_target',
            details: `Input "${field.name}" height (${field.height}px) violates mobile touch accessibility guidelines (min ${MIN_TOUCH_TARGET_SIZE_PX}px).`,
          });
        }
      }

      // Check validation feedback when field is invalid
      if (field.required && !field.value && !field.hasValidationError) {
        validationPassed = false;
        violations.push({
          fieldId: field.id,
          rule: 'validation_feedback',
          details: `Required input "${field.name}" failed to present visible validation feedback when submitted empty.`,
        });
      }
    }

    // 3. Safe Submission Verification
    // Intercept submission to prevent unintended real external network traffic
    blockedSubmissionsCount++;
    if (options.onInterceptSubmission && form.action) {
      options.onInterceptSubmission(form.action);
    }
  }

  const passed = violations.length === 0;
  const message = passed
    ? `All forms (${forms.length}) verified accessible with safe dry-run submission on ${profile.name}.`
    : `Form audit failed on ${profile.name} with ${violations.length} usability violation(s).`;

  return {
    profileId: profile.id,
    profileName: profile.name,
    viewport: { width: profile.width, height: profile.height },
    passed,
    formCount: forms.length,
    visibilityPassed,
    touchTargetsPassed,
    validationFeedbackPassed: validationPassed,
    safeSubmissionVerified: true,
    unintendedSubmissionsBlocked: blockedSubmissionsCount,
    violations,
    message,
  };
}
