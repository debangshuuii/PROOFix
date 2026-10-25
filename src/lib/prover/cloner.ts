import fs from 'node:fs';
import path from 'node:path';

export class ShadowWorkspaceCloner {
  private static defaultIgnores = [
    'node_modules',
    '.git',
    '.next',
    '.proofix-shadow',
    'scratch'
  ];

  public static cloneDirectory(source: string, destination: string, customIgnores: string[] = []): void {
    const ignores = new Set([...this.defaultIgnores, ...customIgnores]);
    fs.mkdirSync(destination, { recursive: true });

    const entries = fs.readdirSync(source, { withFileTypes: true });
    for (const entry of entries) {
      if (ignores.has(entry.name)) continue;

      const srcPath = path.join(source, entry.name);
      const destPath = path.join(destination, entry.name);

      if (entry.isDirectory()) {
        this.cloneDirectory(srcPath, destPath, customIgnores);
      } else if (entry.isFile()) {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}
