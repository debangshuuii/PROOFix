import type {
  ContrastAuditItem,
  ContrastAuditReport,
} from '../types/accessibility.ts';

export interface RgbColor {
  r: number;
  g: number;
  b: number;
  a?: number;
}

/**
 * Parses a CSS hex, rgb, or rgba color string into RGB channel components.
 */
export function parseCssColor(colorStr: string): RgbColor {
  const str = colorStr.trim().toLowerCase();

  // Hex: #fff or #ffffff
  if (str.startsWith('#')) {
    const hex = str.slice(1);
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
        a: 1,
      };
    }
    if (hex.length >= 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: hex.length >= 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1,
      };
    }
  }

  // RGB or RGBA: rgb(255, 255, 255) or rgba(0, 0, 0, 0.5)
  const rgbMatch = str.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1], 10),
      g: parseInt(rgbMatch[2], 10),
      b: parseInt(rgbMatch[3], 10),
      a: rgbMatch[4] !== undefined ? parseFloat(rgbMatch[4]) : 1,
    };
  }

  // Common color keywords fallback
  if (str === 'black') return { r: 0, g: 0, b: 0, a: 1 };
  if (str === 'white') return { r: 255, g: 255, b: 255, a: 1 };

  return { r: 0, g: 0, b: 0, a: 1 };
}

/**
 * Calculates relative luminance for a color component per WCAG 2.1 specs.
 */
function channelLuminance(value: number): number {
  const sRGB = value / 255;
  return sRGB <= 0.04045 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
}

/**
 * Calculates relative luminance of an RGB color.
 * L = 0.2126 * R + 0.7152 * G + 0.0722 * B
 */
export function calculateLuminance(color: RgbColor): number {
  const r = channelLuminance(color.r);
  const g = channelLuminance(color.g);
  const b = channelLuminance(color.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculates WCAG contrast ratio between text color and background color.
 * Ratio = (L1 + 0.05) / (L2 + 0.05)
 */
export function calculateContrastRatio(textColor: RgbColor, backgroundColor: RgbColor): number {
  const l1 = calculateLuminance(textColor);
  const l2 = calculateLuminance(backgroundColor);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  const ratio = (lighter + 0.05) / (darker + 0.05);
  return Math.round(ratio * 100) / 100;
}

/**
 * Determines whether text meets WCAG 2.1 AA contrast requirements.
 * - Normal text: 4.5:1
 * - Large text (>= 24px or >= 18.5px bold): 3.0:1
 */
export function evaluateTextContrast(
  textColorStr: string,
  backgroundColorStr: string,
  fontSizePx: number = 16,
  isBold: boolean = false
): {
  passes: boolean;
  contrastRatio: number;
  requiredRatio: number;
} {
  const textColor = parseCssColor(textColorStr);
  const bgColor = parseCssColor(backgroundColorStr);

  const contrastRatio = calculateContrastRatio(textColor, bgColor);
  const isLargeText = fontSizePx >= 24 || (fontSizePx >= 18.5 && isBold);
  const requiredRatio = isLargeText ? 3.0 : 4.5;

  return {
    passes: contrastRatio >= requiredRatio,
    contrastRatio,
    requiredRatio,
  };
}

/**
 * Audits a collection of elements for contrast compliance.
 */
export function auditElementsContrast(
  elements: Array<{
    selector: string;
    textSnippet: string;
    textColor: string;
    backgroundColor: string;
    fontSizePx: number;
    isBold: boolean;
  }>
): ContrastAuditReport {
  const items: ContrastAuditItem[] = [];
  let failingCount = 0;

  for (const el of elements) {
    const res = evaluateTextContrast(el.textColor, el.backgroundColor, el.fontSizePx, el.isBold);
    if (!res.passes) {
      failingCount++;
    }

    items.push({
      selector: el.selector,
      textSnippet: el.textSnippet,
      textColor: el.textColor,
      backgroundColor: el.backgroundColor,
      fontSizePx: el.fontSizePx,
      isBold: el.isBold,
      contrastRatio: res.contrastRatio,
      requiredRatio: res.requiredRatio,
      passes: res.passes,
    });
  }

  return {
    passed: failingCount === 0,
    elementsAudited: elements.length,
    failingCount,
    items,
  };
}
