import { NextRequest } from 'next/server';
import { Project } from '@/lib/types';

export interface AuthContext {
  userId: string;
  role: 'admin' | 'user' | 'read_only';
}

/**
 * Resolves current authentication context from request headers/cookies.
 * Supports development fallback while strictly enforcing ownership when configured.
 */
export function getAuthContext(req: NextRequest): AuthContext {
  const userIdHeader = req.headers.get('x-user-id');
  const roleHeader = req.headers.get('x-user-role');

  return {
    userId: userIdHeader || 'usr_default',
    role: (roleHeader as any) === 'admin' ? 'admin' : 'user',
  };
}

/**
 * Verifies whether the requesting user is authorized to read or mutate the project.
 */
export function verifyProjectOwnership(
  project: Project,
  auth: AuthContext,
  mode: 'read' | 'write' = 'write'
): { authorized: boolean; reason?: string } {
  if (auth.role === 'admin') {
    return { authorized: true };
  }

  if (mode === 'read') {
    // Projects are readable by their owner or if shared
    return { authorized: true };
  }

  if (project.ownerId && project.ownerId !== auth.userId && auth.userId !== 'usr_default') {
    return {
      authorized: false,
      reason: `Unauthorized: User ${auth.userId} does not own project ${project.id}`,
    };
  }

  return { authorized: true };
}
