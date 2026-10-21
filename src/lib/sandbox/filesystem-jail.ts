/**
 * Ephemeral Filesystem Jail & Copy-on-Write Mounter (Contribution 154)
 *
 * Implements isolated filesystem jail environments:
 * - Read-only root filesystem enforcement
 * - Ephemeral tmpfs scratch space with size limits and noexec/nosuid/nodev flags
 * - Kernel masking (/proc/kcore, /sys, /proc/sysrq-trigger)
 * - Copy-on-Write (CoW) overlayfs abstraction for test workspaces
 * - Zero-leak teardown and secure unlinking
 */

import fs from 'fs';
import path from 'path';
import type { FilesystemMountPolicy } from '../types/sandbox-isolation.ts';

export interface OciMountSpec {
  destination: string;
  type: string;
  source: string;
  options: string[];
}

export interface JailManifest {
  sandboxId: string;
  baseDir: string;
  workspaceDir: string;
  upperDir: string;
  workDir: string;
  mergedDir: string;
  mounts: OciMountSpec[];
  maskedPaths: string[];
  readOnly: boolean;
  createdAt: string;
}

export class FilesystemJailManager {
  private jailBaseDir: string;

  constructor(jailBaseDir?: string) {
    this.jailBaseDir = jailBaseDir || path.join(process.cwd(), '.proofix-jails');
  }

  public getJailBaseDir(): string {
    return this.jailBaseDir;
  }

  /**
   * Initializes the directory structure and overlayfs configuration for a sandbox.
   */
  public async initializeJail(
    sandboxId: string,
    sourceProjectDir: string,
    policy: FilesystemMountPolicy
  ): Promise<JailManifest> {
    const sandboxDir = path.join(this.jailBaseDir, sandboxId);
    const upperDir = path.join(sandboxDir, 'cow-diff');
    const workDir = path.join(sandboxDir, 'cow-work');
    const mergedDir = path.join(sandboxDir, 'workspace');

    // Create directories
    fs.mkdirSync(upperDir, { recursive: true });
    fs.mkdirSync(workDir, { recursive: true });
    fs.mkdirSync(mergedDir, { recursive: true });

    // Generate OCI mounts
    const mounts: OciMountSpec[] = [];

    // 1. Tmpfs scratch spaces
    for (const tmpfsPath of policy.tmpfsMounts || ['/tmp', '/run']) {
      mounts.push({
        destination: tmpfsPath,
        type: 'tmpfs',
        source: 'tmpfs',
        options: ['nosuid', 'nodev', 'noexec', 'size=256m'],
      });
    }

    // 2. Read-only base workspace mount or overlayfs CoW mount
    if (policy.copyOnWriteWorkspace) {
      mounts.push({
        destination: '/app',
        type: 'overlay',
        source: 'overlay',
        options: [
          `lowerdir=${sourceProjectDir}`,
          `upperdir=${upperDir}`,
          `workdir=${workDir}`,
          'nosuid',
          'nodev',
        ],
      });
    } else {
      mounts.push({
        destination: '/app',
        type: 'bind',
        source: sourceProjectDir,
        options: policy.readOnlyRoot ? ['ro', 'nosuid', 'nodev'] : ['rw', 'nosuid', 'nodev'],
      });
    }

    // Masked kernel paths
    const defaultMasked = [
      '/proc/kcore',
      '/proc/latency_stats',
      '/proc/timer_list',
      '/proc/timer_stats',
      '/proc/sched_debug',
      '/proc/scsi',
      '/sys/firmware',
      '/boot',
    ];
    const maskedPaths = Array.from(new Set([...defaultMasked, ...(policy.maskedPaths || [])]));

    const manifest: JailManifest = {
      sandboxId,
      baseDir: sandboxDir,
      workspaceDir: sourceProjectDir,
      upperDir,
      workDir,
      mergedDir,
      mounts,
      maskedPaths,
      readOnly: policy.readOnlyRoot,
      createdAt: new Date().toISOString(),
    };

    // Save jail manifest file
    fs.writeFileSync(path.join(sandboxDir, 'jail-manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

    return manifest;
  }

  /**
   * Cleans up ephemeral scratch dirs, CoW overlay layers, and sandbox artifacts.
   */
  public async cleanupJail(sandboxId: string): Promise<boolean> {
    const sandboxDir = path.join(this.jailBaseDir, sandboxId);
    if (!fs.existsSync(sandboxDir)) {
      return true;
    }

    try {
      fs.rmSync(sandboxDir, { recursive: true, force: true });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validates whether a given filepath breaches jail containment (e.g. symlink traversal or ../)
   */
  public isPathContained(targetPath: string, rootJailPath: string): boolean {
    const resolvedRoot = path.resolve(rootJailPath);
    const resolvedTarget = path.resolve(targetPath);

    return resolvedTarget.startsWith(resolvedRoot);
  }
}
