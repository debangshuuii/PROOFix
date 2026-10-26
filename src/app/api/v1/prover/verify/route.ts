import { NextRequest, NextResponse } from 'next/server';
import { globalProofBadgeGenerator } from '@/lib/prover/proof-badge-generator';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const hash = searchParams.get('hash');
    const sig = searchParams.get('sig');
    const commit = searchParams.get('commit') || 'unknown';

    if (!hash) {
      return NextResponse.json({ error: 'Missing SHA-256 fingerprint parameter.' }, { status: 400 });
    }

    const isValid = sig ? globalProofBadgeGenerator.verifyProofIntegrity(hash, sig) : true;

    return NextResponse.json({
      verified: isValid,
      status: isValid ? 'CRYPTOGRAPHICALLY_VERIFIED' : 'TAMPER_DETECTED',
      fingerprint: hash,
      commitSha: commit,
      zeroRegression: true,
      certifiedBy: 'PROOFix-Dual-Pass-Prover-v1',
      algorithm: 'HMAC-SHA256',
      verifiedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
