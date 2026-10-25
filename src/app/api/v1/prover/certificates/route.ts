import { NextResponse } from 'next/server';
import { globalProofCache } from '@/lib/prover/cache';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (id) {
    const cert = globalProofCache.get(id);
    if (!cert) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
    }
    return NextResponse.json({ certificate: cert });
  }

  const certificates = globalProofCache.list();
  return NextResponse.json({ certificates, count: certificates.length });
}
