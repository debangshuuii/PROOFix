/**
 * Interactive DOM Element Discoverer & Priority Scorer (Contribution 223)
 *
 * Extracts clickable buttons, navigational links, form inputs, and modal triggers from DOM trees,
 * scoring them dynamically by exploration value to maximize branch coverage.
 */

export type ElementType = 'link' | 'button' | 'input' | 'select' | 'menu' | 'toggle';

export interface DiscoveredElement {
  id: string;
  type: ElementType;
  selector: string;
  text: string;
  href?: string;
  inputType?: string;
  ariaLabel?: string;
  isDestructive?: boolean;
  score?: number;
}

export class DomElementDiscoverer {
  /**
   * Discovers interactive elements from HTML string using robust regex parsing.
   */
  public discoverFromHtml(html: string): DiscoveredElement[] {
    const elements: DiscoveredElement[] = [];

    // 1. Discover Links <a ... href="..." ...>
    const linkRegex = /<a\s+(?:[^>]*?\s+)?href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
    let match: RegExpExecArray | null;
    let idx = 0;

    while ((match = linkRegex.exec(html)) !== null) {
      const href = match[1];
      const text = match[2].replace(/<[^>]*>/g, '').trim();

      // Ignore anchor jumps and javascript:void
      if (!href.startsWith('#') && !href.startsWith('javascript:')) {
        elements.push({
          id: `elem-link-${idx++}`,
          type: 'link',
          selector: `a[href="${href}"]`,
          text: text || href,
          href,
        });
      }
    }

    // 2. Discover Buttons <button ...>...</button>
    const buttonRegex = /<button(?:\s+[^>]*)?>(.*?)<\/button>/gi;
    while ((match = buttonRegex.exec(html)) !== null) {
      const text = match[1].replace(/<[^>]*>/g, '').trim();
      const rawTag = match[0];

      const idMatch = rawTag.match(/id=["']([^"']+)["']/i);
      const testIdMatch = rawTag.match(/data-testid=["']([^"']+)["']/i);

      let selector = 'button';
      if (testIdMatch) selector = `button[data-testid="${testIdMatch[1]}"]`;
      else if (idMatch) selector = `#${idMatch[1]}`;
      else if (text) selector = `button:has-text("${text.substring(0, 20)}")`;

      const isDestructive =
        /delete|remove|destroy|cancel/i.test(text) || /btn-danger/i.test(rawTag);

      elements.push({
        id: `elem-btn-${idx++}`,
        type: 'button',
        selector,
        text: text || 'Button',
        isDestructive,
      });
    }

    // 3. Discover Inputs <input ...>
    const inputRegex = /<input(?:\s+([^>]*))?\/?>/gi;
    while ((match = inputRegex.exec(html)) !== null) {
      const attrs = match[1] || '';
      const typeMatch = attrs.match(/type=["']([^"']+)["']/i);
      const nameMatch = attrs.match(/name=["']([^"']+)["']/i);
      const idMatch = attrs.match(/id=["']([^"']+)["']/i);
      const inputType = (typeMatch ? typeMatch[1] : 'text').toLowerCase();

      if (['hidden', 'submit', 'button', 'reset'].includes(inputType)) continue;

      let selector = 'input';
      if (idMatch) selector = `#${idMatch[1]}`;
      else if (nameMatch) selector = `input[name="${nameMatch[1]}"]`;
      else selector = `input[type="${inputType}"]`;

      elements.push({
        id: `elem-input-${idx++}`,
        type: 'input',
        selector,
        text: nameMatch ? nameMatch[1] : inputType,
        inputType,
      });
    }

    return elements;
  }

  /**
   * Calculates an exploration priority score for an interactive element (0 to 100).
   */
  public scorePriority(elem: DiscoveredElement, visitedUrls: Set<string> = new Set()): number {
    let score = 50;

    // Favor unexplored links
    if (elem.type === 'link' && elem.href) {
      if (visitedUrls.has(elem.href)) {
        score -= 30; // already visited
      } else {
        score += 35; // novel route
      }
    }

    // Favor form inputs for fuzzing
    if (elem.type === 'input') {
      score += 25;
      if (['search', 'text', 'email'].includes(elem.inputType || '')) {
        score += 10;
      }
    }

    // Penalize destructive buttons to prevent session reset
    if (elem.isDestructive) {
      score -= 40;
    }

    return Math.max(5, Math.min(100, score));
  }

  /**
   * Returns discovered elements sorted by exploration score descending.
   */
  public rankTargets(elements: DiscoveredElement[], visitedUrls: Set<string> = new Set()): DiscoveredElement[] {
    return elements
      .map((elem) => ({
        ...elem,
        score: this.scorePriority(elem, visitedUrls),
      }))
      .sort((a, b) => (b.score || 0) - (a.score || 0));
  }
}

export const globalDomElementDiscoverer = new DomElementDiscoverer();
