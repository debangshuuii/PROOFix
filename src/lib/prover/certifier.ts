import crypto from 'node:crypto';
import { ProofCertificate, ProofStatus } from '../types/prover';

export class ProofCertifier {
  public static issueCertificate(
    scenarioId: string,
    patchContent: string,
    pass1Failure: { checkId: string; errorSummary: string },
    pass2Verification: {
      targetCheckPassed: boolean;
      regressionCount: number;
      passedRegressionCount: number;
      passRate: number;
      latencyMs: number;
    }
  ): ProofCertificate {
    const patchHash = crypto.createHash('sha256').update(patchContent).digest('hex');
    const timestamp = new Date().toISOString();

    const signaturePayload = JSON.stringify({
      scenarioId,
      patchHash,
      pass1Failure,
      pass2Verification,
      timestamp,
    });

    const sha256Fingerprint = crypto.createHash('sha256').update(signaturePayload).digest('hex');
    const status: ProofStatus = (pass2Verification.targetCheckPassed && pass2Verification.passRate === 1.0)
      ? 'PROVEN'
      : 'REFUTED';

    return {
      certificateId: 'cert_' + sha256Fingerprint.slice(0, 16),
      timestamp,
      status,
      scenarioId,
      sha256Fingerprint,
      patchHash,
      pass1Failure,
      pass2Verification,
      certifiedBy: 'PROOFix-Shadow-Prover-v1',
    };
  }
}
