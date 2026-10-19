import { JourneyStep, StepSelector } from '../types/journey';

export interface PlaywrightActionPlan {
  stepId: string;
  action: string;
  method: string;
  locatorCode?: string;
  actionCode: string;
  isSafe: boolean;
}

export const DISALLOWED_URL_PROTOCOLS = ['javascript:', 'data:', 'file:', 'vbscript:', 'blob:'];
export const SAFE_KEYS = [
  'Enter',
  'Tab',
  'Escape',
  'Backspace',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Space',
];

/**
 * Validates whether a target URL is safe for browser navigation.
 * Strictly disallows javascript:, file:, data: and other arbitrary execution vectors.
 */
export function validateSafeUrl(url: string, allowedHosts?: string[]): { safe: boolean; error?: string } {
  if (!url || typeof url !== 'string') {
    return { safe: false, error: 'URL must be a non-empty string.' };
  }

  const trimmed = url.trim().toLowerCase();

  for (const protocol of DISALLOWED_URL_PROTOCOLS) {
    if (trimmed.startsWith(protocol)) {
      return {
        safe: false,
        error: `Navigation to protocol "${protocol}" is strictly prohibited for security.`,
      };
    }
  }

  // Relative paths like /login or /store are always valid
  if (trimmed.startsWith('/')) {
    return { safe: true };
  }

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return {
        safe: false,
        error: `Invalid protocol "${parsed.protocol}". Only HTTP and HTTPS are permitted.`,
      };
    }

    if (allowedHosts && allowedHosts.length > 0) {
      const isAllowed = allowedHosts.some(
        (host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`)
      );
      if (!isAllowed) {
        return {
          safe: false,
          error: `Host "${parsed.hostname}" is not within allowed destination hosts (${allowedHosts.join(', ')}).`,
        };
      }
    }

    return { safe: true };
  } catch {
    return { safe: false, error: `Malformed URL string: "${url}".` };
  }
}

/**
 * Maps a StepSelector to safe, idiomatic Playwright locator code.
 */
export function mapSelectorToPlaywright(target: StepSelector): string {
  const sanitize = (str: string) => str.replace(/['"\\]/g, '\\$&');

  switch (target.type) {
    case 'role_name':
      const role = target.role ? `'${sanitize(target.role)}'` : `'button'`;
      const name = target.name || target.value;
      return `page.getByRole(${role}, { name: '${sanitize(name)}' })`;

    case 'label':
      return `page.getByLabel('${sanitize(target.value)}')`;

    case 'placeholder':
      return `page.getByPlaceholder('${sanitize(target.value)}')`;

    case 'text':
      return `page.getByText('${sanitize(target.value)}')`;

    case 'testid':
      return `page.getByTestId('${sanitize(target.value)}')`;

    case 'css':
      // Basic sanitize check against inline JS tags
      if (/<script|javascript:/i.test(target.value)) {
        throw new Error(`Potentially malicious CSS selector rejected: "${target.value}"`);
      }
      return `page.locator('${sanitize(target.value)}')`;

    default:
      throw new Error(`Unsupported selector type: "${(target as any).type}"`);
  }
}

/**
 * Maps a structured navigation or interaction step into a validated Playwright action plan.
 * Rejects any arbitrary code execution patterns.
 */
export function mapInteractionToPlaywright(
  step: JourneyStep,
  options: { baseUrl?: string; allowedHosts?: string[] } = {}
): PlaywrightActionPlan {
  switch (step.action) {
    case 'navigate': {
      const url = step.params?.url || '/';
      const check = validateSafeUrl(url, options.allowedHosts);
      if (!check.safe) {
        throw new Error(`Unsafe navigation step rejected: ${check.error}`);
      }
      return {
        stepId: step.id,
        action: 'navigate',
        method: 'goto',
        actionCode: `await page.goto('${url.replace(/'/g, "\\'")}');`,
        isSafe: true,
      };
    }

    case 'click': {
      if (!step.target) throw new Error(`Click step "${step.id}" is missing target selector.`);
      const locator = mapSelectorToPlaywright(step.target);
      return {
        stepId: step.id,
        action: 'click',
        method: 'click',
        locatorCode: locator,
        actionCode: `await ${locator}.click();`,
        isSafe: true,
      };
    }

    case 'fill': {
      if (!step.target) throw new Error(`Fill step "${step.id}" is missing target selector.`);
      const val = step.params?.value || '';
      const locator = mapSelectorToPlaywright(step.target);
      return {
        stepId: step.id,
        action: 'fill',
        method: 'fill',
        locatorCode: locator,
        actionCode: `await ${locator}.fill('${val.replace(/'/g, "\\'")}');`,
        isSafe: true,
      };
    }

    case 'select_option': {
      if (!step.target) throw new Error(`Select option step "${step.id}" is missing target selector.`);
      const opt = step.params?.option || '';
      const locator = mapSelectorToPlaywright(step.target);
      return {
        stepId: step.id,
        action: 'select_option',
        method: 'selectOption',
        locatorCode: locator,
        actionCode: `await ${locator}.selectOption('${opt.replace(/'/g, "\\'")}');`,
        isSafe: true,
      };
    }

    case 'hover': {
      if (!step.target) throw new Error(`Hover step "${step.id}" is missing target selector.`);
      const locator = mapSelectorToPlaywright(step.target);
      return {
        stepId: step.id,
        action: 'hover',
        method: 'hover',
        locatorCode: locator,
        actionCode: `await ${locator}.hover();`,
        isSafe: true,
      };
    }

    case 'press_key': {
      const key = step.params?.key || 'Enter';
      if (!SAFE_KEYS.includes(key)) {
        throw new Error(`Disallowed keyboard key "${key}". Safe keys: ${SAFE_KEYS.join(', ')}`);
      }
      return {
        stepId: step.id,
        action: 'press_key',
        method: 'keyboard.press',
        actionCode: `await page.keyboard.press('${key}');`,
        isSafe: true,
      };
    }

    default:
      throw new Error(`Action "${step.action}" is not a navigation or interaction action.`);
  }
}
