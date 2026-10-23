/**
 * Virtualized Window Calculator for High-Performance Terminal Rendering
 *
 * Computes slice indices and transform offsets so only the DOM rows
 * currently intersecting the viewport (plus overscan buffer) are rendered.
 */

import type { VirtualWindowMetrics } from '../types/terminal.ts';

export class VirtualWindow {
  public static DEFAULT_LINE_HEIGHT_PX = 22;
  public static DEFAULT_OVERSCAN = 8;

  /**
   * Calculates visible virtual window bounds based on scroll position.
   */
  public static calculate(
    scrollTopPx: number,
    viewportHeightPx: number,
    totalLines: number,
    lineHeightPx = VirtualWindow.DEFAULT_LINE_HEIGHT_PX,
    overscan = VirtualWindow.DEFAULT_OVERSCAN
  ): VirtualWindowMetrics {
    if (totalLines <= 0) {
      return {
        totalLines: 0,
        lineHeightPx,
        viewportHeightPx,
        startIndex: 0,
        endIndex: 0,
        offsetYPx: 0,
        visibleCount: 0,
      };
    }

    const clampedScrollTop = Math.max(0, scrollTopPx);
    const rawStartIndex = Math.floor(clampedScrollTop / lineHeightPx);
    const visibleCount = Math.ceil(viewportHeightPx / lineHeightPx);

    const startIndex = Math.max(0, rawStartIndex - overscan);
    const endIndex = Math.min(totalLines, rawStartIndex + visibleCount + overscan);

    const offsetYPx = startIndex * lineHeightPx;

    return {
      totalLines,
      lineHeightPx,
      viewportHeightPx,
      startIndex,
      endIndex,
      offsetYPx,
      visibleCount,
    };
  }

  /**
   * Calculates total scroll container height in pixels.
   */
  public static getTotalHeightPx(totalLines: number, lineHeightPx = VirtualWindow.DEFAULT_LINE_HEIGHT_PX): number {
    return totalLines * lineHeightPx;
  }
}
