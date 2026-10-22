/**
 * Responsive Viewport Matrix & Touch Emulation Agent Types
 * Models mobile, tablet, and desktop device profiles, touch events,
 * and horizontal layout overflow defect schemas.
 */

export type DeviceCategory = 'mobile' | 'tablet' | 'desktop' | 'ultrawide';

export interface DeviceViewportProfile {
  id: string;
  name: string;
  category: DeviceCategory;
  width: number;
  height: number;
  deviceScaleFactor: number;
  isMobile: boolean;
  hasTouch: boolean;
  userAgent?: string;
}

export interface HorizontalOverflowDefect {
  viewportProfileId: string;
  viewportWidth: number;
  documentScrollWidth: number;
  overflowPixels: number;
  offendingElementSelector?: string;
  offendingElementTag?: string;
  offendingElementText?: string;
  offendingBoundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface ViewportAuditResult {
  profile: DeviceViewportProfile;
  hasOverflow: boolean;
  overflowDefect?: HorizontalOverflowDefect;
  screenshotPath?: string;
  durationMs: number;
  passed: boolean;
}

export interface ViewportMatrixSummary {
  profilesAudited: number;
  passedProfilesCount: number;
  failedProfilesCount: number;
  overflowDefects: HorizontalOverflowDefect[];
  results: ViewportAuditResult[];
}
