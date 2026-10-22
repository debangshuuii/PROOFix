/**
 * TypeScript / JSX AST Syntax Validator for Proposed Patches (Contribution 9)
 *
 * Scans proposed unified diff hunks prior to ephemeral sandbox application to trap
 * syntax anomalies, unclosed JSX elements, and brace/bracket imbalance.
 */

import type {
  PatchSyntaxResult,
  PatchSyntaxError,
  PatchCodeLanguage,
} from '../types/patch-proposal.ts';

export class PatchSyntaxValidator {
  /**
   * Infers code language from target filename.
   */
  public static inferLanguage(filename: string): PatchCodeLanguage {
    const ext = filename.toLowerCase().split('.').pop() || '';
    switch (ext) {
      case 'tsx':
        return 'tsx';
      case 'ts':
        return 'typescript';
      case 'jsx':
        return 'jsx';
      case 'js':
      case 'mjs':
      case 'cjs':
        return 'javascript';
      case 'json':
        return 'json';
      case 'css':
        return 'css';
      default:
        return 'typescript';
    }
  }

  /**
   * Extracts added lines from a unified diff string, ignoring headers.
   */
  public static extractAddedCode(unifiedDiff: string): string[] {
    const lines = unifiedDiff.split('\n');
    const addedLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith('+++') || line.startsWith('---') || line.startsWith('@@')) {
        continue;
      }
      if (line.startsWith('+')) {
        addedLines.push(line.substring(1));
      }
    }

    return addedLines;
  }

  /**
   * Validates AST/syntax integrity of proposed diff content.
   */
  public static validate(
    unifiedDiff: string,
    filename: string = 'unknown.tsx'
  ): PatchSyntaxResult {
    const language = this.inferLanguage(filename);
    const addedLines = this.extractAddedCode(unifiedDiff);
    const addedCode = addedLines.join('\n');
    const errors: PatchSyntaxError[] = [];

    let braces = 0;
    let brackets = 0;
    let parentheses = 0;
    const openJsxTags: string[] = [];

    let inString = false;
    let stringChar = '';
    let escapeNext = false;
    let inTemplateLiteral = false;

    // Line-by-line inspection
    addedLines.forEach((lineText, idx) => {
      const lineNum = idx + 1;
      const trimmed = lineText.trim();

      // Check for dangling assignment or unclosed operator at line end
      if (trimmed.endsWith('=') && !trimmed.endsWith('==') && !trimmed.endsWith('===')) {
        errors.push({
          line: lineNum,
          message: 'Dangling assignment operator without right-hand expression',
          ruleId: 'syntax/dangling-assignment',
        });
      }
    });

    // Character token balance scan
    for (let i = 0; i < addedCode.length; i++) {
      const char = addedCode[i];

      if (escapeNext) {
        escapeNext = false;
        continue;
      }

      if (char === '\\') {
        escapeNext = true;
        continue;
      }

      // String boundary handling
      if (!inString && (char === '"' || char === "'")) {
        inString = true;
        stringChar = char;
        continue;
      } else if (inString && char === stringChar) {
        inString = false;
        stringChar = '';
        continue;
      }

      // Template literal handling
      if (!inString && char === '`') {
        inTemplateLiteral = !inTemplateLiteral;
        continue;
      }

      if (inString || inTemplateLiteral) {
        continue;
      }

      // Structural delimiters
      if (char === '{') braces++;
      else if (char === '}') braces--;
      else if (char === '(') parentheses++;
      else if (char === ')') parentheses--;
      else if (char === '[') brackets++;
      else if (char === ']') brackets--;

      // Basic JSX tag scanning for .tsx/.jsx files
      if ((language === 'tsx' || language === 'jsx') && char === '<') {
        const remaining = addedCode.substring(i);
        // Match closing tag </tag>
        const closeMatch = remaining.match(/^<\/([a-zA-Z0-9_\-]+)>/);
        if (closeMatch) {
          const tagName = closeMatch[1];
          const lastTag = openJsxTags[openJsxTags.length - 1];
          if (lastTag === tagName) {
            openJsxTags.pop();
          }
          i += closeMatch[0].length - 1;
          continue;
        }

        // Match opening or self-closing tag <tag ...> or <tag ... />
        const openMatch = remaining.match(/^<([a-zA-Z0-9_\-]+)([^>]*?)(\/?)>/);
        if (openMatch) {
          const tagName = openMatch[1];
          const isSelfClosing = openMatch[3] === '/' || ['img', 'br', 'hr', 'input'].includes(tagName.toLowerCase());
          if (!isSelfClosing) {
            openJsxTags.push(tagName);
          }
          i += openMatch[0].length - 1;
          continue;
        }
      }
    }

    if (inString) {
      errors.push({
        message: 'Unterminated string literal detected in added lines',
        ruleId: 'syntax/unterminated-string',
      });
    }

    if (inTemplateLiteral) {
      errors.push({
        message: 'Unterminated template literal (`...`) detected in added lines',
        ruleId: 'syntax/unterminated-template',
      });
    }

    // Delimiter balance check
    if (braces !== 0) {
      errors.push({
        message: `Unbalanced curly braces in patch: net count ${braces > 0 ? `+${braces}` : braces}`,
        ruleId: 'syntax/unbalanced-braces',
      });
    }

    if (parentheses !== 0) {
      errors.push({
        message: `Unbalanced parentheses in patch: net count ${parentheses > 0 ? `+${parentheses}` : parentheses}`,
        ruleId: 'syntax/unbalanced-parens',
      });
    }

    if (brackets !== 0) {
      errors.push({
        message: `Unbalanced brackets in patch: net count ${brackets > 0 ? `+${brackets}` : brackets}`,
        ruleId: 'syntax/unbalanced-brackets',
      });
    }

    return {
      valid: errors.length === 0,
      language,
      errors,
      unbalancedTokens: {
        braces,
        brackets,
        parentheses,
        jsxTags: openJsxTags,
      },
    };
  }
}
