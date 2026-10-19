import type { NotificationChannelType } from '../types/notification.ts';

// Private and reserved IPv4 CIDR ranges
const PRIVATE_IPV4_PATTERNS = [
  /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, // 127.0.0.0/8 (Loopback)
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, // 10.0.0.0/8 (Private)
  /^192\.168\.\d{1,3}\.\d{1,3}$/, // 192.168.0.0/16 (Private)
  /^172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}$/, // 172.16.0.0/12 (Private)
  /^169\.254\.\d{1,3}\.\d{1,3}$/, // 169.254.0.0/16 (Link-local / Cloud metadata)
  /^0\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, // 0.0.0.0/8 (Broadcast/Current)
  /^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\.\d{1,3}\.\d{1,3}$/, // 100.64.0.0/10 (CGNAT)
];

// Reserved IPv6 patterns
const PRIVATE_IPV6_PATTERNS = [
  /^::1$/, // Loopback
  /^fe80:/i, // Link-local
  /^fc00:/i, // Unique local address
  /^fd[0-9a-f]{2}:/i, // Unique local address
  /^::ffff:(127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|169\.254\.)/i, // IPv4-mapped private
];

const DISALLOWED_HOSTNAMES = [
  'localhost',
  'localhost.localdomain',
  'metadata.google.internal',
  '169.254.169.254',
  'instance-data',
];

const DISALLOWED_HOSTNAME_SUFFIXES = [
  '.localhost',
  '.local',
  '.internal',
  '.lan',
  '.home.arpa',
];

const ALLOWED_SLACK_HOSTS = ['hooks.slack.com'];
const ALLOWED_DISCORD_HOSTS = ['discord.com', 'discordapp.com'];

export interface WebhookValidationResult {
  valid: boolean;
  reason?: string;
  normalizedUrl?: string;
}

/**
 * Validates a candidate webhook destination against SSRF, private network targets,
 * invalid schemes, and unauthorized hostnames.
 * "Done when: tests reject malicious destinations and redirects without making real requests to internal systems."
 */
export function validateWebhookDestination(
  urlInput: string,
  channelType?: NotificationChannelType
): WebhookValidationResult {
  if (!urlInput || typeof urlInput !== 'string') {
    return { valid: false, reason: 'URL must be a non-empty string.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(urlInput.trim());
  } catch {
    return { valid: false, reason: 'Malformed URL format.' };
  }

  // 1. Scheme Check: Strictly HTTPS required
  if (parsed.protocol !== 'https:') {
    return {
      valid: false,
      reason: `Insecure scheme "${parsed.protocol}". Webhook destinations must strictly use "https:".`,
    };
  }

  // 2. Reject credentials embedded in authority (e.g. https://user:pass@evil.com)
  if (parsed.username || parsed.password) {
    return {
      valid: false,
      reason: 'User credentials in webhook URL authority are not allowed.',
    };
  }

  // 3. Port check (standard 443 only)
  if (parsed.port && parsed.port !== '443') {
    return {
      valid: false,
      reason: `Custom webhook port "${parsed.port}" is not permitted. Only standard HTTPS (443) is allowed.`,
    };
  }

  const hostname = parsed.hostname.toLowerCase();

  // 4. Disallowed Hostnames & Suffixes
  if (DISALLOWED_HOSTNAMES.includes(hostname)) {
    return {
      valid: false,
      reason: `Blocked target host "${hostname}" (internal/loopback destination).`,
    };
  }

  for (const suffix of DISALLOWED_HOSTNAME_SUFFIXES) {
    if (hostname.endsWith(suffix)) {
      return {
        valid: false,
        reason: `Blocked domain suffix "${suffix}" in "${hostname}" (private network zone).`,
      };
    }
  }

  // 5. IP Address Checking (Private IPv4 & IPv6)
  for (const pattern of PRIVATE_IPV4_PATTERNS) {
    if (pattern.test(hostname)) {
      return {
        valid: false,
        reason: `Blocked private or cloud metadata IP address: "${hostname}".`,
      };
    }
  }

  for (const pattern of PRIVATE_IPV6_PATTERNS) {
    if (pattern.test(hostname)) {
      return {
        valid: false,
        reason: `Blocked private IPv6 address: "${hostname}".`,
      };
    }
  }

  // 6. Platform Specific Host Restrictions
  if (channelType === 'slack') {
    if (!ALLOWED_SLACK_HOSTS.includes(hostname)) {
      return {
        valid: false,
        reason: `Slack webhook must target allowed hosts (${ALLOWED_SLACK_HOSTS.join(', ')}). Received: "${hostname}".`,
      };
    }
    if (!parsed.pathname.startsWith('/services/')) {
      return {
        valid: false,
        reason: 'Slack webhook path must begin with "/services/".',
      };
    }
  } else if (channelType === 'discord') {
    if (!ALLOWED_DISCORD_HOSTS.includes(hostname)) {
      return {
        valid: false,
        reason: `Discord webhook must target allowed hosts (${ALLOWED_DISCORD_HOSTS.join(', ')}). Received: "${hostname}".`,
      };
    }
    if (!parsed.pathname.startsWith('/api/webhooks/')) {
      return {
        valid: false,
        reason: 'Discord webhook path must begin with "/api/webhooks/".',
      };
    }
  }

  return {
    valid: true,
    normalizedUrl: parsed.toString(),
  };
}

/**
 * Creates safe fetch options that enforce SSRF protections, including disabling automatic redirects.
 */
export function getSafeWebhookFetchOptions(init?: RequestInit): RequestInit {
  return {
    ...init,
    // Strictly disable automatic redirects to prevent open-redirect SSRF
    redirect: 'error',
    headers: {
      ...init?.headers,
      'User-Agent': 'PROOFix-Webhook-Dispatcher/1.0',
    },
  };
}
