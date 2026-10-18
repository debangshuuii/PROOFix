import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { db } from '@/lib/db';
import { analyzeRepository } from '@/lib/analyzer';
import { ProjectVersion } from '@/lib/types';

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

    const targetDir = project.localPath
      ? path.resolve(process.cwd(), project.localPath)
      : process.cwd();

    const analysis = await analyzeRepository(targetDir);

    const versionId = `ver_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newVersion: ProjectVersion = {
      id: versionId,
      projectId: id,
      commitHash: 'head-' + Date.now().toString(36),
      branch: project.defaultBranch || 'main',
      analysis,
      createdAt: new Date().toISOString(),
    };

    await db.createProjectVersion(newVersion);

    // Update project inferred configs if not customized
    if (!project.config.startupCommand) {
      await db.updateProject(id, {
        config: {
          ...project.config,
          startupCommand: analysis.inferredStartup.command,
          port: analysis.inferredStartup.port,
          readinessPath: analysis.inferredStartup.readinessPath,
        },
      });
    }

    return NextResponse.json({
      success: true,
      version: newVersion,
      analysis,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
