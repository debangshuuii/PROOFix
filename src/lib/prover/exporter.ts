import { ProofCertificate } from '../types/prover';

export class ProofCertificateExporter {
  public static toMarkdown(cert: ProofCertificate): string {
    return [
      `# PROOFix Verification Certificate: ${cert.certificateId}`,
      `- **Status**: ${cert.status}`,
      `- **Scenario**: ${cert.scenarioId}`,
      `- **SHA-256 Fingerprint**: \`${cert.sha256Fingerprint}\``,
      `- **Patch Hash**: \`${cert.patchHash}\``,
      `- **Pass 1 Defect**: ${cert.pass1Failure.errorSummary}`,
      `- **Pass 2 Pass Rate**: ${(cert.pass2Verification.passRate * 100).toFixed(1)}%`,
      `- **Certified By**: ${cert.certifiedBy}`,
      `- **Issued At**: ${cert.timestamp}`,
    ].join('\n');
  }
}
