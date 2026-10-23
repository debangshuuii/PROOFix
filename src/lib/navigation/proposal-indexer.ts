/**
 * AI Fix Proposals Entity Indexer for Command Palette
 *
 * Indexes autonomous remediation diffs and code patch proposals
 * with confidence ratings and target file associations.
 */

import type { CommandAction } from '../types/navigation-palette';
import type { ProposalIndexItem } from '../types/palette-indexing';

export class ProposalIndexer {
  /**
   * Transforms a single AI fix proposal into an indexed command action.
   */
  public static mapProposalToCommandAction(proposal: ProposalIndexItem): CommandAction {
    const confidencePct = Math.round(proposal.confidenceScore * 100);
    const title = `AI Fix: ${proposal.title}`;
    const subtitle = `${proposal.targetFile} • ${confidencePct}% confidence • ${proposal.status.toUpperCase()}`;

    const keywords: string[] = [
      proposal.title,
      proposal.targetFile,
      'fix',
      'proposal',
      'patch',
      'ai proposal',
      'diff',
      'remediation',
      'repair',
      proposal.runId,
    ];

    if (proposal.projectName) {
      keywords.push(proposal.projectName);
    }

    if (proposal.testName) {
      keywords.push(proposal.testName);
    }

    return {
      id: `proposal-${proposal.id}`,
      title,
      subtitle,
      category: 'proposals',
      href: `/projects/${proposal.projectId}/runs/${proposal.runId}?tab=proposals`,
      iconName: 'ShieldCheck',
      keywords,
      badge: `${confidencePct}% CONF`,
      actionType: 'navigate',
      status: proposal.status === 'applied' ? 'applied' : 'proposed',
      metadata: {
        proposalId: proposal.id,
        runId: proposal.runId,
        projectId: proposal.projectId,
        targetFile: proposal.targetFile,
        confidenceScore: proposal.confidenceScore,
        status: proposal.status,
        createdAt: proposal.createdAt,
      },
    };
  }

  /**
   * Batch converts proposal entities.
   */
  public static mapProposals(proposals: ProposalIndexItem[]): CommandAction[] {
    return proposals.map((p) => ProposalIndexer.mapProposalToCommandAction(p));
  }
}
