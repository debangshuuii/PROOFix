// Redaction patterns for sensitive tokens, credentials, and API keys
const SENSITIVE_PATTERNS = [
  /AIza[0-9A-Za-z-_]{30,40}/g,                  // Google Gemini / Cloud API keys
  /sk-[a-zA-Z0-9_\-]{20,}/g,                    // OpenAI API keys
  /ghp_[a-zA-Z0-9]{36}/g,                       // GitHub Personal Access Tokens
  /gho_[a-zA-Z0-9]{36}/g,                       // GitHub OAuth Access Tokens
  /bearer\s+[a-zA-Z0-9_\-\.]{20,}/gi,          // Bearer tokens
  /password\s*[:=]\s*["']?[^"'\s,;&]+/gi,       // Password fields
  /secret\s*[:=]\s*["']?[^"'\s,;&]+/gi,         // Secret fields
  /apiKey\s*[:=]\s*["']?[^"'\s,;&]+/gi,         // General API key params
  /postgres:\/\/[^@]+@/gi,                      // Database credentials in URI
  /mongodb(\+srv)?:\/\/[^@]+@/gi,               // Mongo credentials in URI
];

export function redactSensitiveData(input: string): string {
  if (!input) return input;
  let sanitized = input;

  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, (match) => {
      if (match.toLowerCase().startsWith('bearer ')) {
        return 'Bearer [REDACTED_TOKEN]';
      }
      if (match.includes('://')) {
        return match.split('://')[0] + '://[REDACTED_CREDENTIALS]@';
      }
      return '[REDACTED_SECRET]';
    });
  }

  return sanitized;
}
