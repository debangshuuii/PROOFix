/**
 * Enterprise Governance, RBAC & SOC2 Compliance Architecture Types (Contribution 171)
 */

export type UserRole =
  | 'super_admin'
  | 'security_auditor'
  | 'qa_lead'
  | 'developer'
  | 'viewer';

export type Permission =
  | 'runs:read'
  | 'runs:trigger'
  | 'runs:cancel'
  | 'healing:approve'
  | 'fuzzing:execute'
  | 'replay:record'
  | 'secrets:manage'
  | 'audit:export'
  | 'compliance:read'
  | 'retention:configure';

export interface RoleDefinition {
  role: UserRole;
  description: string;
  permissions: Permission[];
  mfaRequired: boolean;
}

export interface AccessContext {
  userId: string;
  userRole: UserRole;
  tenantId: string;
  clientIp?: string;
  mfaAuthenticated: boolean;
}

export interface AuditLogEntry {
  id: string;
  sequenceNumber: number;
  timestamp: string;
  actorId: string;
  actorRole: UserRole;
  tenantId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  clientIp?: string;
  details: Record<string, unknown>;
  previousHash: string;
  entryHash: string; // SHA-256(previousHash + sequenceNumber + timestamp + actorId + action + details)
}

export type Soc2TrustCriterion =
  | 'CC6.1_Access_Security'
  | 'CC6.6_Boundary_Defense'
  | 'CC6.7_Data_Transmission_Encryption'
  | 'A1.2_System_Availability_Redundancy'
  | 'PI1.1_Processing_Integrity_Verification'
  | 'C1.1_Confidentiality_Masking';

export type ComplianceStatus = 'compliant' | 'warning' | 'non_compliant';

export interface Soc2ControlFinding {
  criterion: Soc2TrustCriterion;
  name: string;
  status: ComplianceStatus;
  score: number; // 0 to 100
  evidenceSummary: string;
  remediationAdvice?: string;
  lastEvaluatedAt: string;
}

export interface Soc2ComplianceReport {
  reportId: string;
  generatedAt: string;
  overallScore: number;
  status: ComplianceStatus;
  totalControls: number;
  compliantControls: number;
  findings: Soc2ControlFinding[];
  tamperProofChainVerified: boolean;
}

export interface EvidencePackageManifest {
  packageId: string;
  tenantId: string;
  generatedAt: string;
  auditLedgerHash: string;
  controlFindingsCount: number;
  archiveChecksum: string;
  downloadUrl?: string;
}

export interface RetentionPolicy {
  tenantId: string;
  testRunTtlDays: number;
  sessionVideoTtlDays: number;
  auditLogTtlDays: number; // typically 365+ days for SOC2
  piiMaskingEnabled: boolean;
}
