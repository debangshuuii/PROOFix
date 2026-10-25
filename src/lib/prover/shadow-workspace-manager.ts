import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { ShadowWorkspaceOptions } from '../types/prover';

export class ShadowWorkspaceManager {
  private activeWorkspaces: Map<string, string> = new Map();

  public createShadowWorkspace(options: ShadowWorkspaceOptions): string {
    const id = 'shadow_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
    const rootDir = options.shadowRoot || path.join(options.baseDirectory, '.proofix-shadow');
    const shadowPath = path.join(rootDir, id);

    fs.mkdirSync(shadowPath, { recursive: true });
    this.activeWorkspaces.set(id, shadowPath);
    return shadowPath;
  }

  public cleanup(idOrPath: string): boolean {
    let target = idOrPath;
    for (const [id, p] of this.activeWorkspaces.entries()) {
      if (id === idOrPath || p === idOrPath) {
        target = p;
        this.activeWorkspaces.delete(id);
        break;
      }
    }

    if (fs.existsSync(target)) {
      try {
        fs.rmSync(target, { recursive: true, force: true });
        return true;
      } catch (err) {
        return false;
      }
    }
    return false;
  }

  public getActiveWorkspaces(): string[] {
    return Array.from(this.activeWorkspaces.values());
  }
}

export const globalShadowWorkspaceManager = new ShadowWorkspaceManager();
