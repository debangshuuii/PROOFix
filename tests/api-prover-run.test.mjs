import assert from 'node:assert';
import { POST } from '../src/app/api/v1/prover/run/route.ts';

console.log('[TEST] /api/v1/prover/run route');
const req = new Request('http://localhost/api/v1/prover/run', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ scenarioId: 'ecommerce_checkout' })
});

const res = await POST(req);
const json = await res.json();
assert.strictEqual(json.status, 'PROVEN');
assert(json.certificate.sha256Fingerprint.length === 64);
console.log('✓ /api/v1/prover/run test passed.');
