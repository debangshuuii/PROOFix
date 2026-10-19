import fs from 'fs';
import path from 'path';
import type {
  DependencyInventory,
  DependencyItem,
  DependencyType,
  SupportedEcosystem,
} from '../types/security.ts';
import { detectPackageEcosystems } from './ecosystem-detector.ts';

/**
 * Parses package.json manifest statically without executing project scripts.
 */
export function parsePackageJson(content: string, filePath: string = 'package.json'): {
  items: DependencyItem[];
  errors: string[];
} {
  const items: DependencyItem[] = [];
  const errors: string[] = [];

  try {
    const json = JSON.parse(content);

    const sections: { key: string; type: DependencyType }[] = [
      { key: 'dependencies', type: 'direct' },
      { key: 'devDependencies', type: 'dev' },
      { key: 'peerDependencies', type: 'peer' },
      { key: 'optionalDependencies', type: 'optional' },
    ];

    for (const { key, type } of sections) {
      if (json[key] && typeof json[key] === 'object') {
        for (const [name, rawVersion] of Object.entries(json[key])) {
          if (typeof rawVersion === 'string') {
            // Strip range modifiers for normalized inventory
            const cleanVersion = rawVersion.replace(/^[~^>=<v]+/, '').trim();
            items.push({
              name,
              version: cleanVersion || rawVersion,
              ecosystem: 'npm',
              type,
              resolvedFrom: filePath,
            });
          }
        }
      }
    }
  } catch (err: any) {
    errors.push(`Malformed JSON in manifest "${filePath}": ${err.message}`);
  }

  return { items, errors };
}

/**
 * Parses package-lock.json (supporting v1, v2, and v3 schemas) statically.
 */
export function parsePackageLockJson(content: string, filePath: string = 'package-lock.json'): {
  items: DependencyItem[];
  errors: string[];
} {
  const items: DependencyItem[] = [];
  const errors: string[] = [];

  try {
    const json = JSON.parse(content);

    // v2/v3 Schema: packages dictionary
    if (json.packages && typeof json.packages === 'object') {
      const rootPkg = json.packages[''] || {};
      const directDeps = new Set(Object.keys(rootPkg.dependencies || {}));
      const devDeps = new Set(Object.keys(rootPkg.devDependencies || {}));
      const peerDeps = new Set(Object.keys(rootPkg.peerDependencies || {}));
      const optDeps = new Set(Object.keys(rootPkg.optionalDependencies || {}));

      for (const [pkgPath, pkgData] of Object.entries(json.packages)) {
        if (!pkgPath || pkgPath === '') continue; // Skip root package itself
        const data = pkgData as Record<string, any>;
        if (!data || typeof data !== 'object') continue;

        // Extract package name from node_modules path
        // e.g. "node_modules/lodash" or "node_modules/@babel/core"
        const nmIndex = pkgPath.lastIndexOf('node_modules/');
        if (nmIndex === -1) continue;

        const name = pkgPath.substring(nmIndex + 'node_modules/'.length);
        const version = typeof data.version === 'string' ? data.version : '0.0.0';

        let type: DependencyType = 'transitive';
        if (directDeps.has(name)) type = 'direct';
        else if (devDeps.has(name)) type = 'dev';
        else if (peerDeps.has(name)) type = 'peer';
        else if (optDeps.has(name)) type = 'optional';
        else if (data.dev) type = 'dev';

        items.push({
          name,
          version,
          ecosystem: 'npm',
          type,
          resolvedFrom: filePath,
        });
      }
    } else if (json.dependencies && typeof json.dependencies === 'object') {
      // v1 Schema: dependencies dictionary
      for (const [name, depData] of Object.entries(json.dependencies)) {
        const data = depData as Record<string, any>;
        if (data && typeof data.version === 'string') {
          const type: DependencyType = data.dev ? 'dev' : 'direct';
          items.push({
            name,
            version: data.version,
            ecosystem: 'npm',
            type,
            resolvedFrom: filePath,
          });
        }
      }
    }
  } catch (err: any) {
    errors.push(`Malformed lockfile in "${filePath}": ${err.message}`);
  }

  return { items, errors };
}

/**
 * Parses Python requirements.txt manifest statically.
 */
export function parseRequirementsTxt(content: string, filePath: string = 'requirements.txt'): {
  items: DependencyItem[];
  errors: string[];
} {
  const items: DependencyItem[] = [];
  const errors: string[] = [];

  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine || rawLine.startsWith('#') || rawLine.startsWith('-r') || rawLine.startsWith('-e')) {
      continue;
    }

    // Match name and version: e.g. requests==2.31.0, flask>=2.0.1, urllib3~=1.26.5, or bare name
    const match = rawLine.match(/^([a-zA-Z0-9_\-\.]+)(?:([=><~^!]+)(.*))?$/);
    if (match) {
      const name = match[1];
      const version = match[3] ? match[3].split(';')[0].trim() : '*';
      items.push({
        name,
        version: version || '*',
        ecosystem: 'pypi',
        type: 'direct',
        resolvedFrom: `${filePath}:${i + 1}`,
      });
    } else {
      errors.push(`Could not parse requirements line ${i + 1} in "${filePath}": "${rawLine}"`);
    }
  }

  return { items, errors };
}

/**
 * Generates an auditable dependency inventory for the target project directory
 * without executing any project scripts.
 * "Done when: inventories match known lockfile fixtures and malformed files fail safely."
 */
export async function generateDependencyInventory(projectDir: string): Promise<DependencyInventory> {
  const detection = detectPackageEcosystems(projectDir);
  const allDeps: DependencyItem[] = [];
  const errors: string[] = [];
  const ecosystemsFound = new Set<SupportedEcosystem>();

  for (const eco of detection.ecosystems) {
    if (!eco.supported) continue;
    ecosystemsFound.add(eco.ecosystem as SupportedEcosystem);

    // Prefer lockfile if available for accurate resolved versions
    let hasLockfileDeps = false;

    if (eco.lockfilePath && fs.existsSync(eco.lockfilePath)) {
      try {
        const lockContent = fs.readFileSync(eco.lockfilePath, 'utf-8');
        if (eco.lockfileName === 'package-lock.json') {
          const parsedLock = parsePackageLockJson(lockContent, eco.lockfileName);
          allDeps.push(...parsedLock.items);
          errors.push(...parsedLock.errors);
          hasLockfileDeps = parsedLock.items.length > 0;
        }
      } catch (err: any) {
        errors.push(`Failed reading lockfile "${eco.lockfilePath}": ${err.message}`);
      }
    }

    // Fall back to or complement with manifest if lockfile not parsed
    if (!hasLockfileDeps && fs.existsSync(eco.manifestPath)) {
      try {
        const manifestContent = fs.readFileSync(eco.manifestPath, 'utf-8');
        if (eco.manifestFile === 'package.json') {
          const parsedPkg = parsePackageJson(manifestContent, eco.manifestFile);
          allDeps.push(...parsedPkg.items);
          errors.push(...parsedPkg.errors);
        } else if (eco.manifestFile === 'requirements.txt') {
          const parsedReq = parseRequirementsTxt(manifestContent, eco.manifestFile);
          allDeps.push(...parsedReq.items);
          errors.push(...parsedReq.errors);
        }
      } catch (err: any) {
        errors.push(`Failed reading manifest "${eco.manifestPath}": ${err.message}`);
      }
    }
  }

  // Deduplicate dependencies by name and ecosystem
  const uniqueMap = new Map<string, DependencyItem>();
  for (const dep of allDeps) {
    const key = `${dep.ecosystem}:${dep.name.toLowerCase()}`;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, dep);
    }
  }

  const uniqueList = Array.from(uniqueMap.values());
  const directCount = uniqueList.filter((d) => d.type === 'direct').length;
  const devCount = uniqueList.filter((d) => d.type === 'dev').length;
  const transitiveCount = uniqueList.filter((d) => d.type === 'transitive').length;

  return {
    rootPath: projectDir,
    ecosystems: Array.from(ecosystemsFound),
    totalDependencies: uniqueList.length,
    directCount,
    devCount,
    transitiveCount,
    dependencies: uniqueList,
    errors,
    generatedAt: new Date().toISOString(),
  };
}
