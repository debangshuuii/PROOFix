/**
 * AST Syntax Verification & Multi-Candidate Patch Proposal Schemas (Contribution 8)
 *
 * Defines contracts for AST syntax analysis, multi-candidate ranking, hunk metrics,
 * and coordinated multi-file patch generation before sandbox application.
 */

export type PatchCodeLanguage =
  | 'typescript'
  | 'tsx'
  | 'javascript'
  | 'jsx'
  | 'json'
  | 'css';

export interface PatchSyntaxError {
  line?: number;
  column?: number;
  message: string;
  ruleId: string;
}

export interface PatchSyntaxResult {
  valid: boolean;
  language: PatchCodeLanguage;
  errors: PatchSyntaxError[];
  unbalancedTokens: {
    braces: number;
    brackets: number;
    parentheses: number;
    jsxTags: string[];
  };
}

export interface HunkAnalysis {
  file: string;
  hunkIndex: number;
  linesAdded: number;
  linesDeleted: number;
  modifiesImports: boolean;
  modifiesExports: boolean;
  introducesAsync: boolean;
  detectedKeywords: string[];
}

export type CandidatePatchStrategy =
  | 'ast_targeted'
  | 'llm_guided'
  | 'rule_deterministic'
  | 'fuzz_boundary';

export type PatchRiskRating = 'low' | 'moderate' | 'elevated' | 'critical';

export interface CandidatePatchProposal {
  id: string;
  generatorStrategy: CandidatePatchStrategy;
  unifiedDiff: string;
  targetFiles: string[];
  confidenceScore: number;
  heuristicScore: number;
  astSyntaxValid: boolean;
  securityCheckPassed: boolean;
  riskRating: PatchRiskRating;
  rationale: string;
  hunkAnalyses: HunkAnalysis[];
}

export interface MultiFilePatchManifestItem {
  path: string;
  changeType: 'modify' | 'create' | 'delete';
  diffHunksCount: number;
  estimatedComplexity: number;
}

export interface MultiFilePatchProposal {
  proposalId: string;
  runId: string;
  candidates: CandidatePatchProposal[];
  selectedCandidateId: string;
  coordinationSummary: string;
  affectedFileManifest: MultiFilePatchManifestItem[];
  createdAt: string;
}
