/**
 * HMAC-SHA256 Signature Validator & Secret Scrubber (Contribution 192)
 *
 * Implements cryptographic signature verification for GitHub (X-Hub-Signature-256)
 * and GitLab (X-Gitlab-Token) webhooks using constant-time comparison to prevent timing attacks.
 */

import crypto from 'crypto';
import type { WebhookVerificationResult, GitProvider } from '../types/git-integrations.ts';

export class GitWebhookVerifier {
  /**
   * Verifies GitHub X-Hub-Signature-256 header using HMAC-SHA256 with constant-time equality.
   */
  public verifyGitHubSignature(
    rawPayload: string | Buffer,
    signatureHeader?: string | null,
    secret?: string
  ): WebhookVerificationResult {
    if (!secret) {
      return { valid: false, provider: 'github', error: 'Missing configured webhook secret' };
    }
    if (!signatureHeader) {
      return { valid: false, provider: 'github', error: 'Missing X-Hub-Signature-256 header' };
    }

    const payloadBuffer = typeof rawPayload === 'string' ? Buffer.from(rawPayload, 'utf8') : rawPayload;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payloadBuffer);
    const expectedSignature = `sha256=${hmac.digest('hex')}`;

    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const actualBuffer = Buffer.from(signatureHeader, 'utf8');

    if (expectedBuffer.length !== actualBuffer.length) {
      return { valid: false, provider: 'github', error: 'Signature length mismatch' };
    }

    const isMatch = crypto.timingSafeEqual(expectedBuffer, actualBuffer);
    return {
      valid: isMatch,
      provider: 'github',
      error: isMatch ? undefined : 'HMAC signature mismatch',
    };
  }

  /**
   * Verifies GitLab X-Gitlab-Token header using constant-time comparison.
   */
  public verifyGitLabToken(
    tokenHeader?: string | null,
    secret?: string
  ): WebhookVerificationResult {
    if (!secret) {
      return { valid: false, provider: 'gitlab', error: 'Missing configured webhook secret' };
    }
    if (!tokenHeader) {
      return { valid: false, provider: 'gitlab', error: 'Missing X-Gitlab-Token header' };
    }

    const expectedBuffer = Buffer.from(secret, 'utf8');
    const actualBuffer = Buffer.from(tokenHeader, 'utf8');

    if (expectedBuffer.length !== actualBuffer.length) {
      return { valid: false, provider: 'gitlab', error: 'Token length mismatch' };
    }

    const isMatch = crypto.timingSafeEqual(expectedBuffer, actualBuffer);
    return {
      valid: isMatch,
      provider: 'gitlab',
      error: isMatch ? undefined : 'GitLab secret token mismatch',
    };
  }

  /**
   * Convenience dispatcher detecting provider from request headers.
   */
  public verifyInboundRequest(
    headers: Headers | Record<string, string | undefined>,
    rawBody: string | Buffer,
    secret: string
  ): WebhookVerificationResult {
    const getHeader = (name: string): string | null => {
      if (typeof (headers as Headers).get === 'function') {
        return (headers as Headers).get(name);
      }
      const record = headers as Record<string, string | undefined>;
      return record[name] || record[name.toLowerCase()] || null;
    };

    const githubSig = getHeader('x-hub-signature-256');
    if (githubSig) {
      return this.verifyGitHubSignature(rawBody, githubSig, secret);
    }

    const gitlabToken = getHeader('x-gitlab-token');
    if (gitlabToken) {
      return this.verifyGitLabToken(gitlabToken, secret);
    }

    return {
      valid: false,
      provider: 'github',
      error: 'Unrecognized git provider headers (missing x-hub-signature-256 or x-gitlab-token)',
    };
  }
}

export const globalWebhookVerifier = new GitWebhookVerifier();
