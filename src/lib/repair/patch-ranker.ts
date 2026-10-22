/**
 * Multi-Candidate Patch Ranking Engine with Heuristic Confidence Scoring (Contribution 10)
 *
 * Ranks competing patch candidates based on AST validity, edit locality, line delta complexity,
 * risky keyword penalties, and defensive programming invariants.
 */

import type {
  CandidatePatchProposal,
  HunkAnalysis,
  PatchRiskRating,
} from '../types/patch-proposal.ts';
import { PatchSyntaxValidator } from './patch-syntax-validator.ts';

export interface RankedCandidatesResult {
  sortedCandidates: CandidatePatchProposal[];
  topCandidate: CandidatePatchProposal | null;
  selectionRationale: string;
}

export class PatchRanker {
  /**
   * Analyzes diff hunks for structural metrics and keyword detection.
   */
  public static analyzeHunks(unifiedDiff: string): HunkAnalysis[] {
    const lines = unifiedDiff.split('\n');
    const analyses: HunkAnalysis[] = [];
    let currentFile = 'unknown';
    let currentHunk: HunkAnalysis | null = null;
    let hunkIdx = 0;

    for (const line of lines) {
      if (line.startsWith('+++ b/')) {
        currentFile = line.substring(6).trim();
      } else if (line.startsWith('@@')) {
        if (currentHunk) {
          analyses.push(currentHunk);
        }
        hunkIdx++;
        currentHunk = {
          file: currentFile,
          hunkIndex: hunkIdx,
          linesAdded: 0,
          linesDeleted: 0,
          modifiesImports: false,
          modifiesExports: false,
          introducesAsync: false,
          detectedKeywords: [],
        };
      } else if (currentHunk) {
        if (line.startsWith('+')) {
          currentHunk.linesAdded++;
          const content = line.substring(1);
          if (content.includes('import ')) currentHunk.modifiesImports = true;
          if (content.includes('export ')) currentHunk.modifiesExports = true;
          if (content.includes('async ')) currentHunk.introducesAsync = true;

          // Keyword detection
          const keywords = ['eval', 'dangerouslySetInnerHTML', 'process.exit', 'force', 'skip'];
          for (const kw of keywords) {
            if (content.includes(kw) && !currentHunk.detectedKeywords.includes(kw)) {
              currentHunk.detectedKeywords.push(kw);
            }
          }
        } else if (line.startsWith('-')) {
          currentHunk.linesDeleted++;
        }
      }
    }

    if (currentHunk) {
      analyses.push(currentHunk);
    }

    return analyses;
  }

  /**
   * Evaluates heuristic score (0-100) and risk rating for a candidate patch.
   */
  public static evaluateCandidate(candidate: CandidatePatchProposal): CandidatePatchProposal {
    const hunks = this.analyzeHunks(candidate.unifiedDiff);
    const syntax = PatchSyntaxValidator.validate(candidate.unifiedDiff, candidate.targetFiles[0] || 'file.tsx');

    let heuristicScore = 80;

    // 1. AST Syntax validation impact
    const astValid = syntax.valid;
    if (!astValid) {
      heuristicScore -= 50;
    }

    // 2. Line delta penalty: encourage surgical, minimal edits
    let totalLinesChanged = 0;
    let hasRiskyKeywords = false;

    for (const h of hunks) {
      totalLinesChanged += h.linesAdded + h.linesDeleted;
      if (h.detectedKeywords.length > 0) {
        hasRiskyKeywords = true;
        heuristicScore -= h.detectedKeywords.length * 15;
      }
    }

    if (totalLinesChanged <= 5) {
      heuristicScore += 10; // High bonus for surgical edits
    } else if (totalLinesChanged > 40) {
      heuristicScore -= 20; // Penalize massive rewrites
    }

    // 3. Single-file locality bonus
    if (candidate.targetFiles.length === 1) {
      heuristicScore += 10;
    } else {
      heuristicScore -= (candidate.targetFiles.length - 1) * 8;
    }

    // 4. Defensive coding pattern bonuses
    const addedText = PatchSyntaxValidator.extractAddedCode(candidate.unifiedDiff).join('\n');
    if (addedText.includes('?.') || addedText.includes('??')) {
      heuristicScore += 5; // Safe null navigation
    }
    if (addedText.includes('try {') && addedText.includes('catch')) {
      heuristicScore += 5; // Error boundary / exception guard
    }

    heuristicScore = Math.max(0, Math.min(100, heuristicScore));

    // Determine risk rating
    let riskRating: PatchRiskRating = 'low';
    if (!astValid || hasRiskyKeywords || heuristicScore < 40) {
      riskRating = 'critical';
    } else if (heuristicScore < 60 || candidate.targetFiles.length > 2) {
      riskRating = 'elevated';
    } else if (heuristicScore < 80 || totalLinesChanged > 15) {
      riskRating = 'moderate';
    }

    return {
      ...candidate,
      heuristicScore,
      astSyntaxValid: astValid,
      securityCheckPassed: !hasRiskyKeywords && astValid,
      riskRating,
      hunkAnalyses: hunks,
    };
  }

  /**
   * Ranks an array of candidates and picks the top candidate.
   */
  public static rankCandidates(candidates: CandidatePatchProposal[]): RankedCandidatesResult {
    if (!candidates || candidates.length === 0) {
      return {
        sortedCandidates: [],
        topCandidate: null,
        selectionRationale: 'No candidates provided for ranking.',
      };
    }

    const evaluated = candidates.map((c) => this.evaluateCandidate(c));

    // Sort descending by composite score: 0.6 * confidenceScore + 0.4 * heuristicScore
    const sorted = [...evaluated].sort((a, b) => {
      const compositeA = 0.6 * a.confidenceScore + 0.4 * a.heuristicScore;
      const compositeB = 0.6 * b.confidenceScore + 0.4 * b.heuristicScore;
      return compositeB - compositeA;
    });

    const top = sorted[0];
    const compositeTop = (0.6 * top.confidenceScore + 0.4 * top.heuristicScore).toFixed(1);

    const rationale = `Selected candidate "${top.id}" (Strategy: ${top.generatorStrategy}) with composite score ${compositeTop}/100. Target files: ${top.targetFiles.join(', ')}. Risk rating: ${top.riskRating}.`;

    return {
      sortedCandidates: sorted,
      topCandidate: top,
      selectionRationale: rationale,
    };
  }
}
