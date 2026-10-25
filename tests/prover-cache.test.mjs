import assert from 'node:assert';
import { ProofCertificateCache } from '../src/lib/prover/cache.ts';

console.log('[TEST] ProofCertificateCache');
const cache = new ProofCertificateCache();
const cert = {
  certificateId: 'cert_1',
  scenarioId: 'ecommerce_checkout',
  status: 'PROVEN',
  timestamp: new Date().toISOString(),
  sha256Fingerprint: 'f'.repeat(64),
  patchHash: 'e'.repeat(64),
  pass1Failure: { checkId: '1', errorSummary: 'err' },
  pass2Verification: { targetCheckPassed: true, regressionCount: 1, passedRegressionCount: 1, passRate: 1.0, latencyMs: 100 },
  certifiedBy: 'PROOFix-Shadow-Prover-v1'
};

cache.set(cert);
assert.deepStrictEqual(cache.get('cert_1'), cert);
assert.deepStrictEqual(cache.get('ecommerce_checkout'), cert);
assert.strictEqual(cache.list().length, 1);
console.log('✓ ProofCertificateCache test passed.');
