export class AstPatchValidator {
  public static validateContent(content: string, filename: string): { valid: boolean; error?: string } {
    if (!content || !content.trim()) {
      return { valid: false, error: 'Empty file content' };
    }

    // Basic bracket balancing & syntax preflight
    const openBraces = (content.match(/{/g) || []).length;
    const closeBraces = (content.match(/}/g) || []).length;
    if (openBraces !== closeBraces) {
      return { valid: false, error: `Mismatched curly braces: ${openBraces} open vs ${closeBraces} close` };
    }

    const openParens = (content.match(/\(/g) || []).length;
    const closeParens = (content.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      return { valid: false, error: `Mismatched parentheses: ${openParens} open vs ${closeParens} close` };
    }

    return { valid: true };
  }
}
