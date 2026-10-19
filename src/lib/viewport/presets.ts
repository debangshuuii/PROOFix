import { ViewportProfile } from '../types/viewport';
import { validateViewportProfile, assertValidViewportProfile } from './profile-schema';

export const DEFAULT_VIEWPORT_PRESETS: ReadonlyArray<ViewportProfile> = [
  {
    id: 'desktop-1440x900',
    name: 'Desktop 1440×900',
    label: 'Desktop Viewport Preset (1440×900)',
    category: 'desktop',
    width: 1440,
    height: 900,
    deviceScaleFactor: 1.0,
    hasTouch: false,
    isMobile: false,
    isLandscape: true,
    enabled: true,
    disclaimer:
      'Viewport Preset — Synthetic browser emulation parameters (1440×900); not a guaranteed physical desktop monitor.',
    custom: false,
  },
  {
    id: 'tablet-768x1024',
    name: 'Tablet 768×1024',
    label: 'Tablet Viewport Preset (768×1024)',
    category: 'tablet',
    width: 768,
    height: 1024,
    deviceScaleFactor: 2.0,
    hasTouch: true,
    isMobile: true,
    isLandscape: false,
    enabled: true,
    disclaimer:
      'Viewport Preset — Synthetic browser emulation parameters (768×1024); not a guaranteed physical tablet device.',
    custom: false,
  },
  {
    id: 'mobile-390x844',
    name: 'Mobile 390×844',
    label: 'Mobile Viewport Preset (390×844)',
    category: 'mobile',
    width: 390,
    height: 844,
    deviceScaleFactor: 3.0,
    hasTouch: true,
    isMobile: true,
    isLandscape: false,
    enabled: true,
    disclaimer:
      'Viewport Preset — Synthetic browser emulation parameters (390×844); not a guaranteed physical mobile device.',
    custom: false,
  },
];

/**
 * Returns a cloned deep copy of the default viewport presets.
 */
export function getDefaultViewportPresets(): ViewportProfile[] {
  return JSON.parse(JSON.stringify(DEFAULT_VIEWPORT_PRESETS));
}

/**
 * Enables or disables a specific viewport preset by ID.
 */
export function setPresetEnabled(
  presets: ViewportProfile[],
  profileId: string,
  enabled: boolean
): ViewportProfile[] {
  let found = false;
  const updated = presets.map((p) => {
    if (p.id === profileId) {
      found = true;
      return { ...p, enabled };
    }
    return p;
  });

  if (!found) {
    throw new Error(`Viewport preset with ID "${profileId}" not found.`);
  }

  return updated;
}

/**
 * Customizes an existing preset with validated property overrides.
 */
export function customizePreset(
  presets: ViewportProfile[],
  profileId: string,
  overrides: Partial<Omit<ViewportProfile, 'id'>>
): ViewportProfile[] {
  const target = presets.find((p) => p.id === profileId);
  if (!target) {
    throw new Error(`Viewport preset with ID "${profileId}" not found.`);
  }

  const merged = {
    ...target,
    ...overrides,
    id: target.id, // ID remains immutable
  };

  const validation = validateViewportProfile(merged);
  if (!validation.valid || !validation.profile) {
    throw new Error(`Invalid preset customization: ${validation.errors.join('; ')}`);
  }

  return presets.map((p) => (p.id === profileId ? validation.profile! : p));
}

/**
 * Adds a new custom viewport preset.
 */
export function addCustomPreset(
  presets: ViewportProfile[],
  customProfile: Omit<ViewportProfile, 'custom'>
): ViewportProfile[] {
  if (presets.some((p) => p.id === customProfile.id)) {
    throw new Error(`Viewport profile ID "${customProfile.id}" already exists.`);
  }

  const validated = assertValidViewportProfile({
    ...customProfile,
    custom: true,
  });

  return [...presets, validated];
}

/**
 * Removes a custom preset by ID. Built-in default presets cannot be deleted (only disabled).
 */
export function removePreset(presets: ViewportProfile[], profileId: string): ViewportProfile[] {
  const target = presets.find((p) => p.id === profileId);
  if (!target) {
    throw new Error(`Viewport preset with ID "${profileId}" not found.`);
  }

  if (!target.custom) {
    throw new Error(`Default preset "${profileId}" cannot be removed; disable it instead.`);
  }

  return presets.filter((p) => p.id !== profileId);
}

/**
 * Filters the preset list for currently enabled profiles.
 */
export function getEnabledPresets(presets: ViewportProfile[]): ViewportProfile[] {
  return presets.filter((p) => p.enabled);
}
