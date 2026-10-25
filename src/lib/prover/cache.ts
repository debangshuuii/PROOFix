import { ProofCertificate } from '../types/prover';

export class ProofCertificateCache {
  private cache: Map<string, ProofCertificate> = new Map();

  public set(certificate: ProofCertificate): void {
    this.cache.set(certificate.certificateId, certificate);
    this.cache.set(certificate.scenarioId, certificate);
  }

  public get(idOrScenario: string): ProofCertificate | undefined {
    return this.cache.get(idOrScenario);
  }

  public list(): ProofCertificate[] {
    const unique = new Set(this.cache.values());
    return Array.from(unique);
  }

  public clear(): void {
    this.cache.clear();
  }
}

export const globalProofCache = new ProofCertificateCache();
