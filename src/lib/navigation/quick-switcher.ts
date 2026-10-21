/**
 * Enterprise Quick-Switcher & Deep Link Provider (Contribution 185)
 *
 * Resolves contextual deep links and dynamic quick-switch candidates for
 * active sandboxes, quarantined DLQ jobs, test suites, and compliance packages.
 */

import type { CommandAction } from '../types/navigation-palette.ts';

export interface DeepLinkTarget {
  resourceType: 'test_run' | 'sandbox' | 'dlq_job' | 'evidence_package' | 'project';
  resourceId: string;
  projectId?: string;
}

export class QuickSwitcherProvider {
  /**
   * Generates a canonical URI for any system resource.
   */
  public resolveDeepLink(target: DeepLinkTarget): string {
    switch (target.resourceType) {
      case 'test_run':
        return `/projects/${target.projectId || 'default'}/runs/${target.resourceId}`;
      case 'sandbox':
        return `/sandbox?focus=${encodeURIComponent(target.resourceId)}`;
      case 'dlq_job':
        return `/queue?tab=dlq&jobId=${encodeURIComponent(target.resourceId)}`;
      case 'evidence_package':
        return `/governance?packageId=${encodeURIComponent(target.resourceId)}`;
      case 'project':
        return `/projects/${target.resourceId}`;
      default:
        return '/dashboard';
    }
  }

  /**
   * Transforms raw active sandboxes into command actions.
   */
  public generateSandboxActions(sandboxIds: string[]): CommandAction[] {
    return sandboxIds.map((id) => ({
      id: `switch-sbx-${id}`,
      title: `Jump to Sandbox ${id}`,
      subtitle: 'Inspect live cgroups, memory meters, and seccomp filters',
      category: 'enterprise',
      href: this.resolveDeepLink({ resourceType: 'sandbox', resourceId: id }),
      iconName: 'Shield',
      keywords: ['sandbox', id, 'cgroup'],
      badge: 'Active Sandbox',
      actionType: 'navigate',
    }));
  }

  /**
   * Transforms quarantined DLQ jobs into command actions for rapid redrive.
   */
  public generateDlqActions(
    dlqJobs: Array<{ id: string; queueName: string; reason: string }>
  ): CommandAction[] {
    return dlqJobs.map((job) => ({
      id: `switch-dlq-${job.id}`,
      title: `Inspect DLQ: ${job.id}`,
      subtitle: `${job.queueName} - ${job.reason.slice(0, 50)}...`,
      category: 'operations',
      href: this.resolveDeepLink({ resourceType: 'dlq_job', resourceId: job.id }),
      iconName: 'RotateCcw',
      keywords: ['dlq', 'quarantined', job.id, job.queueName],
      badge: 'DLQ Redrive',
      actionType: 'navigate',
    }));
  }
}

export const globalQuickSwitcher = new QuickSwitcherProvider();
