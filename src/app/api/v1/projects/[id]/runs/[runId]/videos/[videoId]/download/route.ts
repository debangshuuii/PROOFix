import fs from 'fs';
import { NextRequest, NextResponse } from 'next/server';
import { validateDownloadAccess } from '@/lib/video/secure-download';
import { getAuthContext } from '@/lib/security/ownership';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; runId: string; videoId: string }> }
) {
  try {
    const { id: projectId, runId, videoId } = await params;
    const auth = getAuthContext(req);

    const result = await validateDownloadAccess({
      projectId,
      runId,
      videoIdOrName: videoId,
      requesterUserId: auth.userId,
    });

    if (!result.authorized) {
      return NextResponse.json(
        { error: result.errorMessage },
        { status: result.statusCode }
      );
    }

    const fileBuffer = fs.readFileSync(result.diskPath!);
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: result.headers,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
