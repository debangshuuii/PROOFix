import assert from 'node:assert';
import { ProofCertifier } from '../src/lib/prover/certifier.ts';

console.log('[TEST] ProofCertifier');
const cert = ProofCertifier.issueCertificate(
  'ecommerce_checkout',
  'patch content',
  { checkId: 'chk_api', errorSummary: '404' },
  { targetCheckPassed: true, regressionCount: 4, passedRegressionCount: 4, passRate: 1.0, latencyMs: 1200 }
);

assert.strictEqual(cert.status, 'PROVEN');
assert(cert.sha256Fingerprint.length === 64);
assert.strictEqual(cert.certifiedBy, 'PROOFix-Shadow-Prover-v1');
console.log('✓ ProofCertifier test passed.');
