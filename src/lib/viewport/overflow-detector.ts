export interface OverflowExceptionConfig {
  allowedSelectors?: string[];
  tolerancePx?: number;
  ignoreHiddenElements?: boolean;
}

export interface OffendingElementSummary {
  tagName: string;
  id?: string;
  className?: string;
  selectorPath: string;
  width: number;
  right: number;
  overflowPx: number;
}

export interface HorizontalOverflowResult {
  hasOverflow: boolean;
  unexpectedOverflow: boolean;
  scrollWidth: number;
  viewportWidth: number;
  overflowPx: number;
  offendingElements: OffendingElementSummary[];
  approvedScrollContainers: number;
  evaluatedSelectors: string[];
}

export const DEFAULT_ALLOWED_OVERFLOW_SELECTORS: string[] = [
  '.carousel',
  '.horizontal-scroll',
  '.overflow-x-auto',
  '.overflow-x-scroll',
  '[data-intentional-overflow]',
  '[data-scrollable="true"]',
  '[data-carousel="true"]',
  '[role="region"][aria-label*="carousel"]',
  '[role="region"][aria-label*="gallery"]',
];

/**
 * Client-side evaluation script executed inside the browser page context.
 */
export function getOverflowEvaluationScript(
  allowedSelectors: string[] = DEFAULT_ALLOWED_OVERFLOW_SELECTORS,
  tolerancePx: number = 1
): string {
  return `
    (function() {
      const doc = document.documentElement;
      const vpWidth = window.innerWidth;
      const scrollWidth = doc.scrollWidth;
      const overflowPx = Math.max(0, scrollWidth - vpWidth);
      const hasDocOverflow = overflowPx > ${tolerancePx};

      const allowed = ${JSON.stringify(allowedSelectors)};
      const approvedContainers = Array.from(document.querySelectorAll(allowed.join(',')));

      // Helper to check if an element is inside an approved scroll container
      function isInsideApprovedContainer(el) {
        let parent = el.parentElement;
        while (parent && parent !== document.body && parent !== doc) {
          if (approvedContainers.includes(parent)) return true;
          const style = window.getComputedStyle(parent);
          if (style.overflowX === 'scroll' || style.overflowX === 'auto') {
            return true;
          }
          parent = parent.parentElement;
        }
        return false;
      }

      const offending = [];

      if (hasDocOverflow) {
        const allElements = Array.from(document.body.querySelectorAll('*'));
        for (const el of allElements) {
          const rect = el.getBoundingClientRect();
          if (rect.right > vpWidth + ${tolerancePx} || rect.width > vpWidth + ${tolerancePx}) {
            // Check if element is itself an approved container or inside one
            if (approvedContainers.includes(el) || isInsideApprovedContainer(el)) {
              continue;
            }

            // Exclude visually hidden elements
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
              continue;
            }

            offending.push({
              tagName: el.tagName.toLowerCase(),
              id: el.id || undefined,
              className: el.className ? String(el.className).trim() : undefined,
              selectorPath: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className ? '.' + String(el.className).trim().split(' ').join('.') : ''),
              width: Math.round(rect.width),
              right: Math.round(rect.right),
              overflowPx: Math.round(rect.right - vpWidth),
            });
          }
        }
      }

      return {
        hasOverflow: hasDocOverflow,
        unexpectedOverflow: offending.length > 0 || (hasDocOverflow && approvedContainers.length === 0),
        scrollWidth,
        viewportWidth: vpWidth,
        overflowPx,
        offendingElements: offending,
        approvedScrollContainers: approvedContainers.length,
        evaluatedSelectors: allowed,
      };
    })()
  `;
}

/**
 * Pure fixture DOM structure for deterministic offline analysis.
 */
export interface FixtureDomNode {
  tagName: string;
  id?: string;
  className?: string;
  attributes?: Record<string, string>;
  style?: {
    overflowX?: string;
    display?: string;
    visibility?: string;
  };
  rect: {
    width: number;
    right: number;
  };
  children?: FixtureDomNode[];
}

/**
 * Evaluates horizontal overflow on a fixture DOM tree without requiring a running browser.
 */
export function analyzeFixtureDomOverflow(
  root: FixtureDomNode,
  viewportWidth: number,
  config: OverflowExceptionConfig = {}
): HorizontalOverflowResult {
  const allowed = config.allowedSelectors || DEFAULT_ALLOWED_OVERFLOW_SELECTORS;
  const tolerance = config.tolerancePx ?? 1;

  let maxRight = viewportWidth;
  let approvedContainersCount = 0;
  const offending: OffendingElementSummary[] = [];

  function matchesApproved(node: FixtureDomNode): boolean {
    const classList = (node.className || '').split(' ');
    for (const sel of allowed) {
      if (sel.startsWith('.') && classList.includes(sel.substring(1))) return true;
      if (sel.startsWith('[data-') && node.attributes) {
        const attrName = sel.replace(/[\[\]]/g, '').split('=')[0];
        if (node.attributes[attrName] !== undefined) return true;
      }
    }
    if (node.style?.overflowX === 'scroll' || node.style?.overflowX === 'auto') return true;
    return false;
  }

  function traverse(node: FixtureDomNode, inApprovedContainer: boolean) {
    const isApproved = matchesApproved(node);
    if (isApproved) approvedContainersCount++;

    const isInsideApproved = inApprovedContainer || isApproved;

    if (node.rect.right > maxRight) {
      maxRight = node.rect.right;
    }

    if (node.rect.right > viewportWidth + tolerance || node.rect.width > viewportWidth + tolerance) {
      if (!isInsideApproved && node.style?.display !== 'none' && node.style?.visibility !== 'hidden') {
        offending.push({
          tagName: node.tagName,
          id: node.id,
          className: node.className,
          selectorPath: `${node.tagName}${node.id ? '#' + node.id : ''}${node.className ? '.' + node.className.split(' ').join('.') : ''}`,
          width: node.rect.width,
          right: node.rect.right,
          overflowPx: node.rect.right - viewportWidth,
        });
      }
    }

    if (node.children) {
      for (const child of node.children) {
        traverse(child, isInsideApproved);
      }
    }
  }

  traverse(root, false);

  const overflowPx = Math.max(0, maxRight - viewportWidth);
  const hasOverflow = overflowPx > tolerance;

  return {
    hasOverflow,
    unexpectedOverflow: offending.length > 0,
    scrollWidth: Math.max(viewportWidth, maxRight),
    viewportWidth,
    overflowPx,
    offendingElements: offending,
    approvedScrollContainers: approvedContainersCount,
    evaluatedSelectors: allowed,
  };
}
