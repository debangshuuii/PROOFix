import {
  ViewportProfile,
  ViewportProfileValidationResult,
  ViewportCategory,
} from '../types/viewport';

export const MIN_VIEWPORT_WIDTH = 240;
export const MAX_VIEWPORT_WIDTH = 7680;
export const MIN_VIEWPORT_HEIGHT = 240;
export const MAX_VIEWPORT_HEIGHT = 4320;
export const MIN_DEVICE_SCALE_FACTOR = 0.5;
export const MAX_DEVICE_SCALE_FACTOR = 5.0;

export const DEFAULT_VIEWPORT_DISCLAIMER =
  'Viewport Preset — Synthetic browser emulation parameters; not a physical device guarantee.';

/**
 * Validates a viewport profile candidate.
 * Rejects invalid dimensions (non-integers, out of bounds, negative/zero),
 * invalid scale factors, or invalid touch emulation combinations.
 */
export function validateViewportProfile(input: unknown): ViewportProfileValidationResult {
  const errors: string[] = [];

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {
      valid: false,
      errors: ['Viewport profile must be a non-null object.'],
    };
  }

  const raw = input as Record<string, any>;

  // Validate ID
  if (!raw.id || typeof raw.id !== 'string' || raw.id.trim().length === 0) {
    errors.push('Profile "id" is required and must be a non-empty string.');
  } else if (!/^[a-zA-Z0-9_-]+$/.test(raw.id.trim())) {
    errors.push('Profile "id" can only contain letters, numbers, hyphens, and underscores.');
  }

  // Validate Name
  if (!raw.name || typeof raw.name !== 'string' || raw.name.trim().length === 0) {
    errors.push('Profile "name" is required and must be a non-empty string.');
  }

  // Validate Width
  if (raw.width === undefined || raw.width === null) {
    errors.push('Profile "width" is required.');
  } else if (typeof raw.width !== 'number' || !Number.isFinite(raw.width) || isNaN(raw.width)) {
    errors.push('Profile "width" must be a valid number.');
  } else if (!Number.isInteger(raw.width)) {
    errors.push(`Profile "width" must be an integer, got: ${raw.width}.`);
  } else if (raw.width < MIN_VIEWPORT_WIDTH || raw.width > MAX_VIEWPORT_WIDTH) {
    errors.push(
      `Profile "width" must be between ${MIN_VIEWPORT_WIDTH}px and ${MAX_VIEWPORT_WIDTH}px, got: ${raw.width}.`
    );
  }

  // Validate Height
  if (raw.height === undefined || raw.height === null) {
    errors.push('Profile "height" is required.');
  } else if (typeof raw.height !== 'number' || !Number.isFinite(raw.height) || isNaN(raw.height)) {
    errors.push('Profile "height" must be a valid number.');
  } else if (!Number.isInteger(raw.height)) {
    errors.push(`Profile "height" must be an integer, got: ${raw.height}.`);
  } else if (raw.height < MIN_VIEWPORT_HEIGHT || raw.height > MAX_VIEWPORT_HEIGHT) {
    errors.push(
      `Profile "height" must be between ${MIN_VIEWPORT_HEIGHT}px and ${MAX_VIEWPORT_HEIGHT}px, got: ${raw.height}.`
    );
  }

  // Validate Category
  const allowedCategories: ViewportCategory[] = ['desktop', 'tablet', 'mobile', 'custom'];
  const category: ViewportCategory = allowedCategories.includes(raw.category)
    ? raw.category
    : 'custom';

  // Validate Device Scale Factor
  let deviceScaleFactor = 1.0;
  if (raw.deviceScaleFactor !== undefined && raw.deviceScaleFactor !== null) {
    if (
      typeof raw.deviceScaleFactor !== 'number' ||
      !Number.isFinite(raw.deviceScaleFactor) ||
      isNaN(raw.deviceScaleFactor)
    ) {
      errors.push('Profile "deviceScaleFactor" must be a valid number.');
    } else if (
      raw.deviceScaleFactor < MIN_DEVICE_SCALE_FACTOR ||
      raw.deviceScaleFactor > MAX_DEVICE_SCALE_FACTOR
    ) {
      errors.push(
        `Profile "deviceScaleFactor" must be between ${MIN_DEVICE_SCALE_FACTOR} and ${MAX_DEVICE_SCALE_FACTOR}.`
      );
    } else {
      deviceScaleFactor = Number(raw.deviceScaleFactor.toFixed(2));
    }
  }

  // Validate Touch & Mobile flags
  const hasTouch = Boolean(raw.hasTouch);
  const isMobile = Boolean(raw.isMobile);

  // Validate user agent if provided
  if (raw.userAgent !== undefined && raw.userAgent !== null && typeof raw.userAgent !== 'string') {
    errors.push('Profile "userAgent" must be a string if specified.');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const profile: ViewportProfile = {
    id: String(raw.id).trim(),
    name: String(raw.name).trim(),
    label: raw.label ? String(raw.label).trim() : `${String(raw.name).trim()} Viewport Preset`,
    category,
    width: raw.width,
    height: raw.height,
    deviceScaleFactor,
    hasTouch,
    isMobile,
    userAgent: raw.userAgent ? String(raw.userAgent).trim() : undefined,
    isLandscape: raw.isLandscape !== undefined ? Boolean(raw.isLandscape) : raw.width > raw.height,
    enabled: raw.enabled !== undefined ? Boolean(raw.enabled) : true,
    disclaimer: raw.disclaimer ? String(raw.disclaimer).trim() : DEFAULT_VIEWPORT_DISCLAIMER,
    custom: Boolean(raw.custom),
  };

  return {
    valid: true,
    errors: [],
    profile,
  };
}

/**
 * Asserts that a viewport profile is valid, throwing an Error with all validation messages if not.
 */
export function assertValidViewportProfile(input: unknown): ViewportProfile {
  const result = validateViewportProfile(input);
  if (!result.valid || !result.profile) {
    throw new Error(`Invalid ViewportProfile: ${result.errors.join('; ')}`);
  }
  return result.profile;
}
