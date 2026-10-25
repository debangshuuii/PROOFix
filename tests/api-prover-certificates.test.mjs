import assert from 'node:assert';
import { GET } from '../src/app/api/v1/prover/certificates/route.ts';

console.log('[TEST] /api/v1/prover/certificates route');
const req = new Request('http://localhost/api/v1/prover/certificates');
const res = await GET(req);
const json = await res.json();
assert(Array.isArray(json.certificates));
console.log('✓ /api/v1/prover/certificates test passed.');
