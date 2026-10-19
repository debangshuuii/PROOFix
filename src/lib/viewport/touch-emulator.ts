import { ViewportProfile } from '../types/viewport';

export interface PlaywrightEmulationContextOptions {
  viewport: { width: number; height: number };
  deviceScaleFactor: number;
  isMobile: boolean;
  hasTouch: boolean;
  userAgent?: string;
  ignoreHTTPSErrors: boolean;
}

export interface EmulationDistinctionReport {
  profileId: string;
  profileName: string;
  isEmulated: true;
  hardwareDeviceGuaranteed: false;
  executionMode: 'synthetic_software_emulation';
  emulatedCapabilities: {
    touchEvents: boolean;
    mobileViewport: boolean;
    pixelRatio: number;
    customUserAgent: boolean;
  };
  provenByEmulation: string[];
  cannotBeProvenByEmulation: string[];
  distinctionDisclaimer: string;
}

export const DEFAULT_MOBILE_USER_AGENT =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1 (PROOFix Synthetic Viewport Emulation)';

/**
 * Builds Playwright browser context options respecting configured touch and mobile settings.
 */
export function buildPlaywrightEmulationContext(
  profile: ViewportProfile
): PlaywrightEmulationContextOptions {
  const isMobile = Boolean(profile.isMobile);
  const hasTouch = Boolean(profile.hasTouch);
  const deviceScaleFactor = profile.deviceScaleFactor || 1.0;

  // Provide realistic mobile UA if profile is mobile and no custom UA was specified
  let userAgent = profile.userAgent;
  if (!userAgent && isMobile) {
    userAgent = DEFAULT_MOBILE_USER_AGENT;
  }

  return {
    viewport: {
      width: profile.width,
      height: profile.height,
    },
    deviceScaleFactor,
    isMobile,
    hasTouch,
    userAgent,
    ignoreHTTPSErrors: true,
  };
}

/**
 * Generates an explicit distinction report stating clearly that emulation is synthetic
 * and distinguishing it from testing on real physical hardware.
 */
export function generateEmulationDistinctionReport(
  profile: ViewportProfile
): EmulationDistinctionReport {
  return {
    profileId: profile.id,
    profileName: profile.name,
    isEmulated: true,
    hardwareDeviceGuaranteed: false,
    executionMode: 'synthetic_software_emulation',
    emulatedCapabilities: {
      touchEvents: profile.hasTouch,
      mobileViewport: profile.isMobile,
      pixelRatio: profile.deviceScaleFactor,
      customUserAgent: Boolean(profile.userAgent),
    },
    provenByEmulation: [
      'CSS media query breakpoint matching (@media (max-width: ...))',
      'Viewport dimension containment and document horizontal overflow detection',
      'Synthetic touch event dispatch (touchstart, touchend, tap gestures)',
      'Touch target size compliance (>=36px accessibility guidelines)',
      'Responsive navigation drawer expansion via software click/tap simulation',
      'Device pixel ratio raster scaling (1x, 2x, 3x DPR)',
    ],
    cannotBeProvenByEmulation: [
      'Physical hardware digitizer touch latency, multi-touch friction, or palm rejection',
      'True WebKit / Safari iOS mobile browser engine rendering (emulation runs on Chromium engine)',
      'Physical battery drain, CPU throttling, or thermal degradation under mobile load',
      'Hardware display panel color gamut, notch/dynamic island safe area insets',
      'Native OS keyboard display, virtual keyboard resize viewport shifts, and IME composition',
    ],
    distinctionDisclaimer:
      'CRITICAL DISTINCTION: This run was executed using synthetic Chromium emulation. It simulates screen geometry and software event dispatch, but DOES NOT guarantee physical device hardware behavior or proprietary iOS WebKit rendering.',
  };
}
