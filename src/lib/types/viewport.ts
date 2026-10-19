export type ViewportCategory = 'desktop' | 'tablet' | 'mobile' | 'custom';

export interface TouchEmulationSettings {
  hasTouch?: boolean;
  isMobile?: boolean;
  deviceScaleFactor?: number;
  userAgent?: string;
}

export interface ViewportProfile {
  id: string;
  name: string;
  label: string;
  category: ViewportCategory;
  width: number;
  height: number;
  deviceScaleFactor: number;
  hasTouch: boolean;
  isMobile: boolean;
  userAgent?: string;
  isLandscape?: boolean;
  enabled: boolean;
  disclaimer: string;
  custom?: boolean;
}

export interface ViewportProfileValidationResult {
  valid: boolean;
  errors: string[];
  profile?: ViewportProfile;
}

export interface ViewportExecutionRecord {
  profileId: string;
  profileName: string;
  viewport: {
    width: number;
    height: number;
    deviceScaleFactor: number;
    isMobile: boolean;
    hasTouch: boolean;
  };
  status: 'passed' | 'failed' | 'inconclusive' | 'timeout' | 'skipped';
  durationMs: number;
  testResultIds: string[];
  screenshotPaths: string[];
  horizontalOverflow?: {
    detected: boolean;
    overflowPx?: number;
    scrollWidth?: number;
    viewportWidth?: number;
    offendingElementsCount?: number;
  };
  responsiveNav?: {
    evaluated: boolean;
    menuToggleFound?: boolean;
    toggleWorked?: boolean;
    keyLinksAccessible?: boolean;
    missingLinks?: string[];
  };
  formUsability?: {
    evaluated: boolean;
    formsEvaluated?: number;
    touchTargetViolations?: number;
    safeSubmissionVerified?: boolean;
  };
  emulationNotice: string;
  error?: string;
}

export interface MultiViewportMatrixSummary {
  totalProfiles: number;
  passedProfiles: number;
  failedProfiles: number;
  profileResults: ViewportExecutionRecord[];
}
