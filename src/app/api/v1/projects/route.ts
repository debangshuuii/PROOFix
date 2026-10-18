import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Project } from '@/lib/types';

export async function GET() {
  try {
    const projects = await db.getProjects();
    return NextResponse.json({ projects });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, repoUrl, repoProvider = 'github', defaultBranch = 'main', localPath, config } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 });
    }

    const newProject: Project = {
      id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      ownerId: 'usr_default',
      name: name.trim(),
      description: description ? description.trim() : '',
      repoUrl: repoUrl ? repoUrl.trim() : undefined,
      repoProvider,
      defaultBranch: defaultBranch || 'main',
      localPath,
      config: {
        startupCommand: config?.startupCommand || 'npm run dev',
        buildCommand: config?.buildCommand || 'npm run build',
        installCommand: config?.installCommand || 'npm install',
        port: config?.port || 3000,
        readinessPath: config?.readinessPath || '/',
        timeoutSecs: config?.timeoutSecs || 45,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await db.createProject(newProject);
    return NextResponse.json({ project: saved }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
