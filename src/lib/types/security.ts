export type SupportedEcosystem = 'npm' | 'pypi';
export type EcosystemType = SupportedEcosystem | 'unsupported';

export interface DetectedEcosystem {
  ecosystem: EcosystemType;
  manifestPath: string;
  manifestFile: string;
  lockfilePath?: string;
  lockfileName?: string;
  supported: boolean;
  packageManager?: 'npm' | 'pnpm' | 'yarn' | 'bun' | 'pip' | 'poetry' | 'pipenv';
}

export interface EcosystemDetectionResult {
  hasManifests: boolean;
  ecosystems: DetectedEcosystem[];
  unsupportedManifests: string[];
  missingManifests: boolean;
  summary: string;
}

export type DependencyType = 'direct' | 'dev' | 'peer' | 'optional' | 'transitive';

export interface DependencyItem {
  name: string;
  version: string;
  ecosystem: SupportedEcosystem;
  type: DependencyType;
  resolvedFrom: string;
}

export interface DependencyInventory {
  rootPath: string;
  ecosystems: SupportedEcosystem[];
  totalDependencies: number;
  directCount: number;
  devCount: number;
  transitiveCount: number;
  dependencies: DependencyItem[];
  errors: string[];
  generatedAt: string;
}

export interface VulnerabilityFinding {
  id: string;
  advisoryId: string;
  aliases: string[];
  packageName: string;
  packageVersion: string;
  ecosystem: SupportedEcosystem;
  dependencyType: DependencyType;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  cvssScore?: number;
  summary: string;
  details?: string;
  source: 'osv' | 'github_advisory' | 'nvd' | 'fixture_database';
  patchedVersions: string[];
  fixedIn?: string;
  remediationGuidance: string;
  scannedAt: string;
}

export interface SecretFinding {
  id: string;
  detectorType: string;
  filePath: string;
  lineNumber: number;
  columnNumber?: number;
  redactedExcerpt: string;
  mask: string;
  confidence: 'high' | 'medium';
  severity: 'critical' | 'high';
}

export interface SecurityGatePolicy {
  enabled: boolean;
  blockOnVulnerabilitySeverity: 'critical' | 'high' | 'medium' | 'none';
  blockOnSecrets: boolean;
  allowIncompleteScans: boolean;
  ignoredAdvisoryIds?: string[];
  ignoredSecretRules?: string[];
}

export interface SecurityGateEvaluation {
  passed: boolean;
  blocked: boolean;
  action: 'proceed' | 'warn' | 'block';
  reasons: string[];
  isIncomplete: boolean;
  totalVulnerabilities: number;
  blockingVulnerabilitiesCount: number;
  totalSecrets: number;
  blockingSecretsCount: number;
  evaluatedAt: string;
}

export interface SecurityPreflightReport {
  id: string;
  projectId: string;
  runId?: string;
  gateEvaluation: SecurityGateEvaluation;
  inventory: DependencyInventory;
  vulnerabilities: VulnerabilityFinding[];
  secrets: SecretFinding[];
  uncheckablePackages: { name: string; version: string; reason: string }[];
  scannedFilesCount: number;
  skippedFilesCount: number;
  scanDurationMs: number;
  createdAt: string;
}

export interface HardenedScanOptions {
  timeoutMs?: number;
  maxDependencies?: number;
  maxFilesToScan?: number;
  consentExternalNetworkLookup?: boolean;
  gatePolicy?: SecurityGatePolicy;
  scratchBaseDir?: string;
  simulateTimeout?: boolean;
}

export interface HardenedScanExecutionResult {
  report: SecurityPreflightReport;
  timedOut: boolean;
  externalNetworkUsed: boolean;
  resourceLimitsExceeded: boolean;
  errors: string[];
}
