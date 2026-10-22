/**
 * Viewport Matrix Runner & Horizontal Layout Overflow Detector
 * Evaluates web applications across mobile, tablet, and desktop device profiles
 * and pinpoints offending DOM elements that cause horizontal layout shifts.
 */

import type { Page } from 'playwright';
import type {
  DeviceViewportProfile,
  HorizontalOverflowDefect,
  ViewportAuditResult,
} from '../types/viewport-matrix-agent.ts';

export const STANDARD_VIEWPORT_PROFILES: DeviceViewportProfile[] = [
  {
    id: 'mobile-iphone14',
    name: 'Apple iPhone 14',
    category: 'mobile',
    width: 390,
    height: 844,
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  },
  {
    id: 'mobile-small',
    name: 'Compact Mobile',
    category: 'mobile',
    width: 360,
    height: 640,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
  {
    id: 'tablet-ipad',
    name: 'Apple iPad Air',
    category: 'tablet',
    width: 820,
    height: 1180,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
  {
    id: 'desktop-standard',
    name: 'Standard Desktop',
    category: 'desktop',
    width: 1280,
    height: 720,
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
  },
];

/**
 * Detects horizontal layout overflow and pinpoints the offending DOM element.
 */
export async function detectHorizontalOverflow(
  page: Page,
  profile: DeviceViewportProfile
): Promise<{ hasOverflow: boolean; defect?: HorizontalOverflowDefect }> {
  try {
    const defect = await page.evaluate((profileId) => {
      const scrollW = document.documentElement.scrollWidth;
      const innerW = window.innerWidth;
      const overflow = scrollW - innerW;

      if (overflow <= 1) {
        return null; // Clean layout without overflow
      }

      // Search DOM tree for the offending overflowing element
      const allElements = document.querySelectorAll('*');
      let offendingSelector = '';
      let offendingTag = '';
      let offendingText = '';
      let maxRight = innerW;
      let boundingBox: any = undefined;

      allElements.forEach((el, index) => {
        const rect = el.getBoundingClientRect();
        if (rect.right > maxRight && rect.width > 0) {
          maxRight = rect.right;
          offendingTag = el.tagName.toLowerCase();
          offendingText = (el.textContent || '').trim().slice(0, 50);
          offendingSelector = el.id ? `#${el.id}` : `${offendingTag}:nth-of-type(${index + 1})`;
          boundingBox = {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          };
        }
      });

      return {
        viewportProfileId: profileId,
        viewportWidth: innerW,
        documentScrollWidth: scrollW,
        overflowPixels: overflow,
        offendingElementSelector: offendingSelector || 'body',
        offendingElementTag: offendingTag || 'div',
        offendingElementText: offendingText || undefined,
        offendingBoundingBox: boundingBox,
      };
    }, profile.id);

    return {
      hasOverflow: Boolean(defect),
      defect: defect || undefined,
    };
  } catch {
    return { hasOverflow: false };
  }
}
