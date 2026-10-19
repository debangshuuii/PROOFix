import fs from 'fs';
import path from 'path';
import type {
  DetectedEcosystem,
  EcosystemDetectionResult,
  SupportedEcosystem,
} from '../types/security.ts';

interface ManifestConfig {
  file: string;
  ecosystem: SupportedEcosystem;
  lockfiles: { file: string; pm: DetectedEcosystem['packageManager'] }[];
  defaultPm: DetectedEcosystem['packageManager'];
}

const SUPPORTED_MANIFEST_CONFIGS: ManifestConfig[] = [
  {
    file: 'package.json',
    ecosystem: 'npm',
    lockfiles: [
      { file: 'pnpm-lock.yaml', pm: 'pnpm' },
      { file: 'yarn.lock', pm: 'yarn' },
      { file: 'bun.lockb', pm: 'bun' },
      { file: 'package-lock.json', pm: 'npm' },
    ],
    defaultPm: 'npm',
  },
  {
    file: 'requirements.txt',
    ecosystem: 'pypi',
    lockfiles: [],
    defaultPm: 'pip',
  },
  {
    file: 'pyproject.toml',
    ecosystem: 'pypi',
    lockfiles: [
      { file: 'poetry.lock', pm: 'poetry' },
      { file: 'Pipfile.lock', pm: 'pipenv' },
    ],
    defaultPm: 'poetry',
  },
  {
    file: 'Pipfile',
    ecosystem: 'pypi',
    lockfiles: [{ file: 'Pipfile.lock', pm: 'pipenv' }],
    defaultPm: 'pipenv',
  },
];

const UNSUPPORTED_MANIFEST_MAP: Record<string, string> = {
  'pom.xml': 'Java / Maven',
  'build.gradle': 'Java / Gradle',
  'build.gradle.kts': 'Kotlin / Gradle',
  'Cargo.toml': 'Rust / Cargo',
  'go.mod': 'Go Modules',
  'Gemfile': 'Ruby / Bundler',
  'composer.json': 'PHP / Composer',
};

/**
 * Detects package manifests and lockfiles for supported ecosystems (npm, Python),
 * and accurately identifies missing or unsupported package manifests.
 * "Done when: detection works on fixtures and unsupported or missing manifests are reported accurately."
 */
export function detectPackageEcosystems(targetDir: string): EcosystemDetectionResult {
  if (!fs.existsSync(targetDir)) {
    return {
      hasManifests: false,
      ecosystems: [],
      unsupportedManifests: [],
      missingManifests: true,
      summary: `Directory does not exist: ${targetDir}`,
    };
  }

  const detected: DetectedEcosystem[] = [];
  const unsupportedList: string[] = [];

  // Check supported manifests
  for (const config of SUPPORTED_MANIFEST_CONFIGS) {
    const manifestPath = path.join(targetDir, config.file);
    if (fs.existsSync(manifestPath)) {
      let resolvedLockfile: string | undefined;
      let resolvedPm = config.defaultPm;

      for (const lf of config.lockfiles) {
        const lfPath = path.join(targetDir, lf.file);
        if (fs.existsSync(lfPath)) {
          resolvedLockfile = lf.file;
          resolvedPm = lf.pm;
          break;
        }
      }

      detected.push({
        ecosystem: config.ecosystem,
        manifestPath,
        manifestFile: config.file,
        lockfilePath: resolvedLockfile ? path.join(targetDir, resolvedLockfile) : undefined,
        lockfileName: resolvedLockfile,
        supported: true,
        packageManager: resolvedPm,
      });
    }
  }

  // Check unsupported manifests
  for (const [manifestFile, ecosystemName] of Object.entries(UNSUPPORTED_MANIFEST_MAP)) {
    const unsuppPath = path.join(targetDir, manifestFile);
    if (fs.existsSync(unsuppPath)) {
      unsupportedList.push(`${manifestFile} (${ecosystemName})`);
    }
  }

  const hasManifests = detected.length > 0;
  const missingManifests = detected.length === 0 && unsupportedList.length === 0;

  let summary = '';
  if (detected.length > 0) {
    const names = detected.map((d) => `${d.ecosystem} (${d.manifestFile}${d.lockfileName ? ` + ${d.lockfileName}` : ''})`).join(', ');
    summary = `Detected supported ecosystem(s): ${names}.`;
  } else if (unsupportedList.length > 0) {
    summary = `Detected unsupported ecosystem manifest(s): ${unsupportedList.join(', ')}.`;
  } else {
    summary = 'No package manifests or lockfiles detected in target repository.';
  }

  return {
    hasManifests,
    ecosystems: detected,
    unsupportedManifests: unsupportedList,
    missingManifests,
    summary,
  };
}
