import fs from 'node:fs';
import path from 'node:path';

export interface PatchApplyResult {
  success: boolean;
  appliedFile?: string;
  backupPath?: string;
  error?: string;
}

export class AtomicPatchApplicator {
  public static applyToShadow(shadowPath: string, relativeFile: string, replacementContent: string): PatchApplyResult {
    const target = path.join(shadowPath, relativeFile);
    try {
      const backup = target + '.bak';
      if (fs.existsSync(target)) {
        fs.copyFileSync(target, backup);
      }
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, replacementContent, 'utf-8');

      return {
        success: true,
        appliedFile: target,
        backupPath: backup,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Failed to apply patch',
      };
    }
  }

  public static rollback(targetFile: string, backupPath: string): boolean {
    if (fs.existsSync(backupPath)) {
      fs.copyFileSync(backupPath, targetFile);
      fs.unlinkSync(backupPath);
      return true;
    }
    return false;
  }
}
