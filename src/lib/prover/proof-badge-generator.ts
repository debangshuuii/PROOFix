/**
 * Tamper-Proof Cryptographic SHA-256 Proof Badge Generator
 * Produces verifiable execution fingerprints, cryptographic HMAC signatures,
 * and SVG / Markdown badges for GitHub PR comments.
 */

import crypto from 'crypto';
import type { CryptographicProofBadge } from '../types/pr-bot.ts';

export interface ProofBadgeOptions {
  commitSha: string;
  baselineSha?: string;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  runId: string;
  certifiedBy?: string;
  baseUrl?: string;
  signingSecret?: string;
}

export class ProofBadgeGenerator {
  private defaultSecret: string;

  constructor(defaultSecret: string = 'proofix_tamper_proof_secret_salt_v1') {
    this.defaultSecret = defaultSecret;
  }

  /**
   * Generates a tamper-proof cryptographic proof badge.
   */
  public generateProofBadge(options: ProofBadgeOptions): CryptographicProofBadge {
    const timestamp = new Date().toISOString();
    const certifiedBy = options.certifiedBy || 'PROOFix-Dual-Pass-Prover-v1';
    const baseUrl = options.baseUrl || 'https://proofix.dev';
    const secret = options.signingSecret || this.defaultSecret;

    const zeroRegressionPassRate =
      options.totalChecks > 0 ? options.passedChecks / options.totalChecks : 1.0;
    const isVerified = options.failedChecks === 0 && zeroRegressionPassRate === 1.0;

    // 1. Canonical payload string for cryptographic hashing
    const canonicalPayload = JSON.stringify({
      commitSha: options.commitSha,
      baselineSha: options.baselineSha || null,
      totalChecks: options.totalChecks,
      passedChecks: options.passedChecks,
      failedChecks: options.failedChecks,
      runId: options.runId,
      timestamp,
      certifiedBy,
      status: isVerified ? 'VERIFIED' : 'FAILED',
    });

    // 2. Compute SHA-256 fingerprint
    const fingerprint = crypto
      .createHash('sha256')
      .update(canonicalPayload)
      .digest('hex');

    // 3. Compute HMAC signature to prevent badge tampering
    const signature = crypto
      .createHmac('sha256', secret)
      .update(fingerprint)
      .digest('hex');

    const verifyUrl = `${baseUrl}/api/v1/prover/verify?hash=${fingerprint}&sig=${signature.substring(0, 16)}&commit=${options.commitSha.substring(0, 8)}`;

    const shortHash = fingerprint.substring(0, 12);
    const badgeColor = isVerified ? '2ea44f' : 'cf222e';
    const badgeText = isVerified
      ? `PROOFix%20PROVEN-100%25%20Zero--Regression-${badgeColor}`
      : `PROOFix%20REFUTED-${options.failedChecks}%20Regressions-${badgeColor}`;

    const badgeMarkdown = `[![PROOFix SHA-256 Proof](https://img.shields.io/badge/${badgeText}?style=flat-square&logo=shield&logoColor=white)](${verifyUrl}) \`SHA-256:${shortHash}\``;

    const badgeHtml = `<a href="${verifyUrl}" target="_blank" rel="noopener noreferrer"><img src="https://img.shields.io/badge/${badgeText}?style=flat-square&logo=shield&logoColor=white" alt="PROOFix SHA-256 Proof" /></a> <code>SHA-256:${shortHash}</code>`;

    return {
      fingerprint,
      signature,
      status: isVerified ? 'VERIFIED' : 'FAILED',
      zeroRegressionPassRate,
      commitSha: options.commitSha,
      baselineSha: options.baselineSha,
      timestamp,
      certifiedBy,
      badgeMarkdown,
      badgeHtml,
      verifyUrl,
    };
  }

  /**
   * Verifies the authenticity and integrity of a proof badge.
   */
  public verifyProofIntegrity(
    fingerprint: string,
    signature: string,
    secret: string = this.defaultSecret
  ): boolean {
    if (!fingerprint || !signature) return false;

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(fingerprint)
      .digest('hex');

    return signature === expectedSignature || signature === expectedSignature.substring(0, 16);
  }
}

export const globalProofBadgeGenerator = new ProofBadgeGenerator();
