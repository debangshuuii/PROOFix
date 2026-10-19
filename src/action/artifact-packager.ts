import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { TestResult } from '../lib/types';

export interface ArtifactPackageOptions {
  runId: string;
  reportDir: string;
  outputZipPath?: string;
  results?: TestResult[];
  logs?: string[];
}

export interface ArtifactPackageResult {
  zipPath: string;
  fileCount: number;
  totalSizeBytes: number;
  includedFiles: string[];
  manifestPath: string;
  availableOnFailure: boolean;
}

/**
 * Packages verification reports, screenshots, execution logs, and diff images into an inspectable zip archive.
 * Guaranteed to produce an archive after both successful and failed verification runs.
 */
export async function packageVerificationArtifacts(
  options: ArtifactPackageOptions
): Promise<ArtifactPackageResult> {
  const { runId, reportDir, results = [], logs = [] } = options;

  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const zip = new AdmZip();
  const includedFiles: string[] = [];

  // 1. Write execution logs to report directory if not already there
  const logFilePath = path.join(reportDir, 'proofix-execution.log');
  if (logs.length > 0) {
    fs.writeFileSync(logFilePath, logs.join('\n'), 'utf-8');
  }
  if (fs.existsSync(logFilePath)) {
    zip.addLocalFile(logFilePath);
    includedFiles.push('proofix-execution.log');
  }

  // 2. Add JSON and HTML reports
  const jsonReport = path.join(reportDir, 'proofix-report.json');
  if (fs.existsSync(jsonReport)) {
    zip.addLocalFile(jsonReport);
    includedFiles.push('proofix-report.json');
  }

  const htmlReport = path.join(reportDir, 'proofix-report.html');
  if (fs.existsSync(htmlReport)) {
    zip.addLocalFile(htmlReport);
    includedFiles.push('proofix-report.html');
  }

  const mdSummary = path.join(reportDir, 'proofix-summary.md');
  if (fs.existsSync(mdSummary)) {
    zip.addLocalFile(mdSummary);
    includedFiles.push('proofix-summary.md');
  }

  // 3. Add captured screenshots from test results
  const screenshotsAdded = new Set<string>();
  for (const r of results) {
    const scPath = r.evidence?.screenshotPath;
    if (scPath && !screenshotsAdded.has(scPath)) {
      screenshotsAdded.add(scPath);
      const absPath = scPath.startsWith('/')
        ? path.join(process.cwd(), 'public', scPath)
        : path.resolve(process.cwd(), scPath);

      if (fs.existsSync(absPath)) {
        zip.addLocalFile(absPath, 'screenshots');
        includedFiles.push(`screenshots/${path.basename(absPath)}`);
      }
    }
  }

  // 4. Add visual diff images if present
  const diffsDir = path.join(process.cwd(), 'public', 'artifacts', 'diffs');
  if (fs.existsSync(diffsDir)) {
    const diffFiles = fs.readdirSync(diffsDir);
    for (const f of diffFiles) {
      if (f.endsWith('.png')) {
        zip.addLocalFile(path.join(diffsDir, f), 'diffs');
        includedFiles.push(`diffs/${f}`);
      }
    }
  }

  // 5. Generate artifact manifest JSON
  const manifest = {
    runId,
    packagedAt: new Date().toISOString(),
    fileCount: includedFiles.length,
    files: includedFiles,
    availableOnFailure: true,
  };

  const manifestPath = path.join(reportDir, 'artifacts-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  zip.addLocalFile(manifestPath);
  includedFiles.push('artifacts-manifest.json');

  // 6. Write final zip archive
  const defaultZipName = `proofix-artifacts-${runId}.zip`;
  const finalZipPath = options.outputZipPath
    ? path.resolve(process.cwd(), options.outputZipPath)
    : path.join(reportDir, defaultZipName);

  zip.writeZip(finalZipPath);

  const stat = fs.statSync(finalZipPath);

  return {
    zipPath: finalZipPath,
    fileCount: includedFiles.length,
    totalSizeBytes: stat.size,
    includedFiles,
    manifestPath,
    availableOnFailure: true,
  };
}
