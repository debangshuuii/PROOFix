import crypto from 'crypto';
import { sanitizeLogOutput, assertZeroSecretLeakage } from '../security/secret-redaction.ts';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits recommended for AES-GCM
const DEFAULT_SALT = 'proofix_vault_salt_v1';

/**
 * Derives a deterministic 32-byte encryption key for AES-256-GCM.
 */
function getEncryptionKey(): Buffer {
  const masterSecret =
    process.env.PROOFIX_SECRET_ENCRYPTION_KEY ||
    process.env.AUTH_SECRET ||
    'proofix_secure_vault_master_key_v1_2026';
  return crypto.scryptSync(masterSecret, DEFAULT_SALT, 32);
}

export interface EncryptedSecretRecord {
  format: 'aes-256-gcm';
  iv: string; // hex
  tag: string; // hex
  ciphertext: string; // hex
}

/**
 * Encrypts a plaintext webhook URL with AES-256-GCM authenticated encryption.
 * "Store webhook URLs using the project's approved secret-management approach"
 */
export function encryptWebhookUrl(plainUrl: string): string {
  if (!plainUrl || typeof plainUrl !== 'string') {
    throw new Error('Cannot encrypt empty or invalid webhook URL.');
  }

  const trimmed = plainUrl.trim();
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(trimmed, 'utf-8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  const record: EncryptedSecretRecord = {
    format: 'aes-256-gcm',
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    ciphertext: encrypted.toString('hex'),
  };

  return `enc:v1:${Buffer.from(JSON.stringify(record)).toString('base64')}`;
}

/**
 * Decrypts an AES-256-GCM encrypted webhook URL.
 * Throws an error if ciphertext or authentication tag has been tampered with.
 */
export function decryptWebhookUrl(encryptedPayload: string): string {
  if (!encryptedPayload || !encryptedPayload.startsWith('enc:v1:')) {
    throw new Error('Invalid or unsupported encrypted webhook secret format.');
  }

  const rawJson = Buffer.from(encryptedPayload.slice(7), 'base64').toString('utf-8');
  let record: EncryptedSecretRecord;
  try {
    record = JSON.parse(rawJson);
  } catch (err: any) {
    throw new Error(`Failed parsing encrypted secret payload: ${err.message}`);
  }

  if (record.format !== 'aes-256-gcm' || !record.iv || !record.tag || !record.ciphertext) {
    throw new Error('Malformed EncryptedSecretRecord structure.');
  }

  const key = getEncryptionKey();
  const iv = Buffer.from(record.iv, 'hex');
  const tag = Buffer.from(record.tag, 'hex');
  const ciphertext = Buffer.from(record.ciphertext, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  try {
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('utf-8');
  } catch (err: any) {
    throw new Error(`Integrity check failed: secret was tampered with or corrupted (${err.message}).`);
  }
}

/**
 * Creates a safe, non-leaking masked representation of a webhook URL.
 * Retains scheme, platform host, and last 4 characters while replacing token with '••••••••'.
 * "never returned in plaintext by ordinary settings APIs"
 */
export function maskWebhookUrl(plainUrl: string): string {
  if (!plainUrl || typeof plainUrl !== 'string') {
    return '••••••••••••••••';
  }

  try {
    const parsed = new URL(plainUrl.trim());
    const host = parsed.host;
    const pathname = parsed.pathname;

    if (pathname.length <= 8) {
      return `${parsed.protocol}//${host}/••••••••`;
    }

    const tail = pathname.slice(-4);
    const prefix = pathname.slice(0, 10);
    return `${parsed.protocol}//${host}${prefix}••••••••${tail}`;
  } catch {
    // If invalid URL, mask completely except tail
    const trimmed = plainUrl.trim();
    if (trimmed.length <= 6) return '••••••••';
    return `••••••••••••${trimmed.slice(-4)}`;
  }
}

/**
 * Sanitizes any log or diagnostic string to guarantee webhook URLs and secrets are never leaked.
 * "redact them from logs."
 */
export function sanitizeWebhookLogs(logText: string, sensitiveUrls: string[] = []): string {
  if (!logText || typeof logText !== 'string') return '';

  // Redact Slack webhook token patterns
  let sanitized = logText.replace(
    /(https:\/\/hooks\.slack\.com\/services\/)[A-Za-z0-9/_.*-]+/g,
    '$1[REDACTED_SLACK_WEBHOOK]'
  );

  // Redact Discord webhook token patterns
  sanitized = sanitized.replace(
    /(https:\/\/discord(?:app)?\.com\/api\/webhooks\/\d+\/)[A-Za-z0-9/_.*-]+/g,
    '$1[REDACTED_DISCORD_WEBHOOK]'
  );

  // General log sanitization
  sanitized = sanitizeLogOutput(sanitized, sensitiveUrls);

  return sanitized;
}

export { assertZeroSecretLeakage };
