export interface ActionPermissionsPolicy {
  standard: Record<string, 'read' | 'write' | 'none'>;
  readOnly: Record<string, 'read' | 'none'>;
  prProposal: Record<string, 'read' | 'write' | 'none'>;
}

/**
 * Declares the least-privilege permissions required by PROOFix Action for different workflows.
 */
export const MINIMUM_PERMISSIONS: ActionPermissionsPolicy = {
  // Read-only verification (Smoke tests & static checks)
  readOnly: {
    contents: 'read',
  },
  // Standard verification with Step Summary and artifact upload
  standard: {
    contents: 'read',
    actions: 'read',
  },
  // Pull request verification with AI repair proposals and checks annotation
  prProposal: {
    contents: 'read',
    'pull-requests': 'write',
    checks: 'write',
    actions: 'read',
  },
};

const SENSITIVE_PATTERNS = [
  // GitHub Personal Access Tokens and OAuth tokens
  { regex: /gh[pousr]_[A-Za-z0-9_]{36,255}/g, replacement: '[REDACTED_GITHUB_TOKEN]' },
  { regex: /github_pat_[A-Za-z0-9_]{82}/g, replacement: '[REDACTED_GITHUB_PAT]' },
  // Bearer tokens / JWT
  { regex: /Bearer\s+[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/gi, replacement: 'Bearer [REDACTED_JWT]' },
  // Anthropic & OpenAI keys
  { regex: /sk-ant-[A-Za-z0-9-_]{16,128}/g, replacement: '[REDACTED_ANTHROPIC_KEY]' },
  { regex: /sk-[A-Za-z0-9]{20,64}/g, replacement: '[REDACTED_OPENAI_KEY]' },
  // Database connection strings containing passwords
  { regex: /(postgres|mysql|mongodb(\+srv)?):\/\/[^:]+:([^@]+)@/gi, replacement: '$1://[USER]:[REDACTED_PASSWORD]@' },
  // Key-value pairs for secrets in logs/env
  { regex: /(AUTH_SECRET|DATABASE_URL|API_KEY|SECRET|PASSWORD)=([^\s\n"';]+)/gi, replacement: '$1=[REDACTED_SECRET]' },
  // Private keys
  { regex: /-----BEGIN[ A-Z0-9_-]+PRIVATE KEY-----[^-]+-----END[ A-Z0-9_-]+PRIVATE KEY-----/g, replacement: '[REDACTED_PRIVATE_KEY]' },
];

/**
 * Sanitizes log output and error messages, ensuring no credentials or sensitive tokens are exposed.
 */
export function sanitizeActionLog(logMessage: string, customSecrets: string[] = []): string {
  if (!logMessage || typeof logMessage !== 'string') return '';

  let sanitized = logMessage;

  // 1. Redact known regex token patterns
  for (const { regex, replacement } of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(regex, replacement);
  }

  // 2. Redact any known environment secrets
  const envSecrets = [
    process.env.GITHUB_TOKEN,
    process.env.ACTIONS_RUNTIME_TOKEN,
    process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN,
    ...customSecrets,
  ].filter((s): s is string => Boolean(s && s.length >= 6));

  for (const secret of envSecrets) {
    if (sanitized.includes(secret)) {
      sanitized = sanitized.split(secret).join('[REDACTED_ENV_SECRET]');
    }
  }

  return sanitized;
}
