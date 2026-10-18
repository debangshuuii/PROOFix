import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import AdmZip from 'adm-zip';
import { db } from '@/lib/db';

const MAX_ARCHIVE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_UNCOMPRESSED_SIZE = 150 * 1024 * 1024; // 150MB

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await db.getProjectById(id);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No archive file uploaded' }, { status: 400 });
    }

    if (file.size > MAX_ARCHIVE_SIZE) {
      return NextResponse.json(
        { error: `Archive exceeds maximum permitted size of ${MAX_ARCHIVE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let zip: AdmZip;

    try {
      zip = new AdmZip(buffer);
    } catch (err: any) {
      return NextResponse.json({ error: 'Corrupt or unsupported archive format. Must be a valid .zip' }, { status: 400 });
    }

    const extractDir = path.join(process.cwd(), 'data', 'workspaces', id);
    if (!fs.existsSync(extractDir)) {
      fs.mkdirSync(extractDir, { recursive: true });
    }

    const zipEntries = zip.getEntries();
    let totalUncompressed = 0;

    // Security validation: Zip Slip & Symlink checks
    for (const entry of zipEntries) {
      totalUncompressed += entry.header.size;

      if (totalUncompressed > MAX_UNCOMPRESSED_SIZE) {
        return NextResponse.json(
          { error: 'Archive uncompressed size violates security limits (potential zip bomb rejected).' },
          { status: 400 }
        );
      }

      // Check path traversal
      const normalizedPath = path.normalize(entry.entryName);
      if (normalizedPath.startsWith('..') || path.isAbsolute(normalizedPath)) {
        return NextResponse.json(
          { error: `Security violation: Path traversal detected in entry "${entry.entryName}". Upload rejected.` },
          { status: 400 }
        );
      }
    }

    // Safely extract
    zip.extractAllTo(extractDir, true);

    const updated = await db.updateProject(id, {
      localPath: path.relative(process.cwd(), extractDir),
      repoProvider: 'local_upload',
    });

    return NextResponse.json({
      success: true,
      filesExtracted: zipEntries.length,
      extractedPath: extractDir,
      project: updated,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
