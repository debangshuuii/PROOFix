import assert from 'node:assert';
import { ProofCertificateExporter } from '../src/lib/prover/exporter.ts';

console.log('[TEST] ProofCertificateExporter');
const md = ProofCertificateExporter.toMarkdown({
  certificateId: 'cert_123',
  status: 'PROVEN',
  scenarioId: 'ecommerce_checkout',
  sha256Fingerprint: 'a'.repeat(64),
  patchHash: 'b'.repeat(64),
  pass1Failure: { checkId: '1', errorSummary: 'Error' },
  pass2Verification: { targetCheckPassed: true, regressionCount: 4, passedRegressionCount: 4, passRate: 1.0, latencyMs: 500 },
  certifiedBy: 'PROOFix-Shadow-Prover-v1',
  timestamp: new Date().toISOString()
});

assert(md.includes('# PROOFix Verification Certificate'));
assert(md.includes('PROVEN'));
console.log('✓ ProofCertificateExporter test passed.');
