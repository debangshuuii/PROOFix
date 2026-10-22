import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { proposalsRegistry } from '../review/route';
import { proveCandidatePatch } from '@/lib/repair/patch-prover';
import { PatchSyntaxValidator } from '@/lib/repair/patch-syntax-validator';
import { SecurityPatchGuard } from '@/lib/repair/security-patch-guard';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    let proposal = proposalsRegistry.get(id);

    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    if (!proposal.appliedWorkspacePath || !fs.existsSync(proposal.appliedWorkspacePath)) {
      return NextResponse.json(
        { error: 'Patch has not been applied to a disposable workspace yet. Call /apply first.' },
        { status: 400 }
      );
    }

    const start = Date.now();
    const workspace = proposal.appliedWorkspacePath;

    // 1. AST Syntax Pre-validation
    const primaryFile = proposal.affectedFiles[0] || 'page.tsx';
    const syntaxReport = PatchSyntaxValidator.validate(proposal.proposedChanges, primaryFile);
    const securityCheck = SecurityPatchGuard.scanPatch(proposal.proposedChanges, proposal.affectedFiles);

    // 2. Execute isolated patch prover
    const provingReport = await proveCandidatePatch({
      proposal,
      workspacePath: workspace,
      targetCheckName: 'Route Link Integrity',
      regressionCheckNames: ['Accessibility Audit', 'Layout Overflow', 'Syntax Compilation'],
    });

    const durationMs = Date.now() - start;

    if (provingReport.outcome === 'verified_fix' && syntaxReport.valid && securityCheck.allowed) {
      proposal.validationStatus = 'verified';
      proposal.verificationOutcome = {
        status: 'passed',
        summary: `Verified Fix: Target failure resolved with zero regressions. AST syntax valid.`,
        durationMs,
        testedAt: new Date().toISOString(),
      };
    } else if (provingReport.outcome === 'regression_detected') {
      proposal.validationStatus = 'regression_detected';
      proposal.verificationOutcome = {
        status: 'partial',
        summary: `Partial improvement: Target check resolved, but ${provingReport.regressionsCount} regression(s) detected in adjacent tests.`,
        durationMs,
        testedAt: new Date().toISOString(),
      };
    } else {
      proposal.validationStatus = 'invalid';
      proposal.verificationOutcome = {
        status: 'failed',
        summary: provingReport.diagnostics || 'Unsuccessful attempt: Original test failure persists in patched workspace.',
        durationMs,
        testedAt: new Date().toISOString(),
      };
    }

    proposal.updatedAt = new Date().toISOString();
    proposalsRegistry.set(id, proposal);

    return NextResponse.json({
      success: true,
      proposal,
      outcome: proposal.verificationOutcome,
      astValid: syntaxReport.valid,
      securitySafe: securityCheck.allowed,
      provingReport,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
