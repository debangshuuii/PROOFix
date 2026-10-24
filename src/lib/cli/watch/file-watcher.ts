/**
 * PROOFix CLI Local File Watcher
 * Watches source and test directories with configurable debounce and noise filtering.
 */

import fs from 'fs';
import path from 'path';

export interface FileWatcherOptions {
  targetDir?: string;
  debounceMs?: number;
  ignoredPatterns?: RegExp[];
  onChange?: (changedFiles: string[]) => void;
}

const DEFAULT_IGNORED: RegExp[] = [
  /(^|[\\/])\.git([\\/]|$)/,
  /(^|[\\/])node_modules([\\/]|$)/,
  /(^|[\\/])\.next([\\/]|$)/,
  /(^|[\\/])\.proofix([\\/]|$)/,
  /(^|[\\/])data[\\/]proofix_db\.json$/,
  /\.proofix\.bak$/,
  /\.swp$/,
  /\.tmp$/,
];

export class LocalFileWatcher {
  private targetDir: string;
  private debounceMs: number;
  private ignoredPatterns: RegExp[];
  private onChange?: (changedFiles: string[]) => void;
  private watchers: fs.FSWatcher[] = [];
  private pendingChanges = new Set<string>();
  private debounceTimer: NodeJS.Timeout | null = null;
  private isWatching = false;

  constructor(options: FileWatcherOptions = {}) {
    this.targetDir = path.resolve(process.cwd(), options.targetDir || '.');
    this.debounceMs = options.debounceMs ?? 300;
    this.ignoredPatterns = options.ignoredPatterns ?? DEFAULT_IGNORED;
    this.onChange = options.onChange;
  }

  public isIgnored(filePath: string): boolean {
    return this.ignoredPatterns.some((pattern) => pattern.test(filePath));
  }

  public start(): this {
    if (this.isWatching) return this;
    this.isWatching = true;

    // Watch key directories
    const watchPaths = ['src', 'tests'];
    for (const rel of watchPaths) {
      const fullPath = path.join(this.targetDir, rel);
      if (fs.existsSync(fullPath)) {
        try {
          const watcher = fs.watch(fullPath, { recursive: true }, (_eventType, filename) => {
            if (!filename) return;
            const changedFile = path.join(rel, filename.toString());
            if (this.isIgnored(changedFile)) return;

            this.pendingChanges.add(changedFile);

            if (this.debounceTimer) {
              clearTimeout(this.debounceTimer);
            }

            this.debounceTimer = setTimeout(() => {
              const files = Array.from(this.pendingChanges);
              this.pendingChanges.clear();
              this.debounceTimer = null;
              if (files.length > 0 && this.onChange) {
                this.onChange(files);
              }
            }, this.debounceMs);
          });

          this.watchers.push(watcher);
        } catch {
          // If recursive watch is unsupported on platform, fallback gracefully
        }
      }
    }

    return this;
  }

  public stop(): void {
    if (!this.isWatching) return;
    this.isWatching = false;

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    for (const w of this.watchers) {
      try {
        w.close();
      } catch {}
    }
    this.watchers = [];
  }

  public isActive(): boolean {
    return this.isWatching;
  }
}
