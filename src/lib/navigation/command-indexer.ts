/**
 * Command Palette Search Index & Fuzzy Action Matcher (Contribution 182)
 *
 * Provides indexed action registration, fuzzy search scoring, acronym expansion,
 * and category filtering for the global Cmd+K command palette.
 */

import type {
  CommandAction,
  NavigationCategory,
} from '../types/navigation-palette';
import type {
  EntityIndexBundle,
  ProjectIndexItem,
  RunIndexItem,
  FailingTestIndexItem,
  ProposalIndexItem,
} from '../types/palette-indexing';
import { EnterpriseEntityIndexer } from './enterprise-entity-indexer';

export const DEFAULT_COMMAND_ACTIONS: CommandAction[] = [
  // Core
  {
    id: 'nav-dashboard',
    title: 'Dashboard Overview',
    subtitle: 'System health, recent runs, and verification status',
    category: 'core',
    href: '/dashboard',
    shortcut: ['g', 'd'],
    iconName: 'LayoutDashboard',
    keywords: ['home', 'dashboard', 'overview', 'metrics', 'runs'],
    actionType: 'navigate',
  },
  {
    id: 'nav-projects',
    title: 'Projects Directory',
    subtitle: 'Active applications, repositories, and test configurations',
    category: 'core',
    href: '/projects',
    shortcut: ['g', 'p'],
    iconName: 'FolderGit2',
    keywords: ['projects', 'repositories', 'repos', 'apps'],
    actionType: 'navigate',
  },
  {
    id: 'nav-settings',
    title: 'Platform Settings',
    subtitle: 'Global API keys, webhook integrations, and defaults',
    category: 'core',
    href: '/settings',
    shortcut: ['g', 's'],
    iconName: 'Settings',
    keywords: ['settings', 'preferences', 'configuration', 'api keys', 'webhooks'],
    actionType: 'navigate',
  },

  // Enterprise
  {
    id: 'nav-sandbox',
    title: 'Sandbox & MicroVM Isolation',
    subtitle: 'Linux cgroups v2, network shields, and rootless containers',
    category: 'enterprise',
    href: '/sandbox',
    shortcut: ['g', 'x'],
    iconName: 'Shield',
    keywords: ['sandbox', 'microvm', 'firecracker', 'cgroups', 'container', 'isolation', 'mvm'],
    badge: 'Cgroups v2',
    actionType: 'navigate',
  },
  {
    id: 'nav-queue',
    title: 'Distributed Queue & DB Sharding',
    subtitle: 'Priority FIFO queues, worker pool, and DLQ quarantine',
    category: 'enterprise',
    href: '/queue',
    shortcut: ['g', 'q'],
    iconName: 'Layers',
    keywords: ['queue', 'database', 'sharding', 'dlq', 'workers', 'outbox', 'backoff'],
    badge: 'At-Least-Once',
    actionType: 'navigate',
  },
  {
    id: 'nav-governance',
    title: 'Enterprise Governance & SOC2',
    subtitle: 'Cryptographic SHA-256 audit ledger and Trust Criteria reports',
    category: 'security',
    href: '/governance',
    shortcut: ['g', 'g'],
    iconName: 'ShieldCheck',
    keywords: ['governance', 'soc2', 'audit', 'compliance', 'rbac', 'vanta', 'drata', 'ledger'],
    badge: 'SOC2 Type II',
    actionType: 'navigate',
  },

  // Testing Actions
  {
    id: 'act-trigger-run',
    title: 'Trigger Verification Run',
    subtitle: 'Dispatch new Playwright end-to-end journey in sandbox',
    category: 'testing',
    shortcut: ['t', 'r'],
    iconName: 'Play',
    keywords: ['trigger', 'run', 'test', 'verify', 'playwright'],
    actionType: 'execute',
    handlerId: 'trigger_run',
  },
  {
    id: 'act-api-fuzz',
    title: 'Start API Fuzzing Audit',
    subtitle: 'Autonomous contract boundary and fuzzing vulnerability probe',
    category: 'testing',
    shortcut: ['t', 'f'],
    iconName: 'Terminal',
    keywords: ['fuzz', 'fuzzing', 'api', 'openapi', 'boundary', 'security'],
    actionType: 'execute',
    handlerId: 'api_fuzz',
  },
  {
    id: 'act-redrive-dlq',
    title: 'Redrive Dead-Letter Queue (DLQ)',
    subtitle: 'Re-queue quarantined poisoned jobs with reset backoff',
    category: 'operations',
    iconName: 'RotateCcw',
    keywords: ['redrive', 'retry', 'dlq', 'dead letter', 'requeue'],
    badge: 'DLQ Redrive',
    actionType: 'execute',
    handlerId: 'redrive_dlq',
  },
  {
    id: 'act-export-evidence',
    title: 'Export SOC2 Evidence Bundle (.ZIP)',
    subtitle: 'Generate cryptographically verified auditor bundle',
    category: 'security',
    shortcut: ['e', 'e'],
    iconName: 'Download',
    keywords: ['export', 'evidence', 'zip', 'auditor', 'soc2', 'vanta'],
    actionType: 'execute',
    handlerId: 'export_evidence',
  },
];

export class CommandIndexer {
  private actions: Map<string, CommandAction> = new Map();
  private entityIndexer: EnterpriseEntityIndexer = new EnterpriseEntityIndexer();

  constructor(initialActions: CommandAction[] = DEFAULT_COMMAND_ACTIONS) {
    for (const action of initialActions) {
      this.actions.set(action.id, action);
    }
  }

  /**
   * Returns the dynamic entity indexer.
   */
  public getEntityIndexer(): EnterpriseEntityIndexer {
    return this.entityIndexer;
  }

  /**
   * Ingests a bundle of projects, runs, failures, and proposals.
   */
  public ingestBundle(bundle: EntityIndexBundle): void {
    this.entityIndexer.indexBundle(bundle);
  }

  public indexProjects(projects: ProjectIndexItem[]): void {
    this.entityIndexer.indexProjects(projects);
  }

  public indexRuns(runs: RunIndexItem[]): void {
    this.entityIndexer.indexRuns(runs);
  }

  public indexFailures(failures: FailingTestIndexItem[]): void {
    this.entityIndexer.indexFailures(failures);
  }

  public indexProposals(proposals: ProposalIndexItem[]): void {
    this.entityIndexer.indexProposals(proposals);
  }

  /**
   * Registers a new dynamic action into the index.
   */
  public registerAction(action: CommandAction): void {
    this.actions.set(action.id, action);
  }

  /**
   * Searches and ranks actions by fuzzy relevance score.
   */
  public search(query: string, categoryFilter?: NavigationCategory): CommandAction[] {
    const trimmed = query.trim().toLowerCase();
    const staticActions = Array.from(this.actions.values());
    const dynamicActions = this.entityIndexer.getAllActions();
    const allActions = [...staticActions, ...dynamicActions];

    const candidateActions = categoryFilter
      ? allActions.filter((a) => a.category === categoryFilter)
      : allActions;

    if (!trimmed) {
      return candidateActions;
    }

    const scored: Array<{ action: CommandAction; score: number }> = [];

    for (const action of candidateActions) {
      const score = this.calculateMatchScore(action, trimmed);
      if (score > 0) {
        scored.push({ action, score });
      }
    }

    // Sort descending by relevance score
    scored.sort((a, b) => b.score - a.score);
    return scored.map((item) => item.action);
  }

  /**
   * Enhanced fuzzy matching and relevance scoring algorithm.
   */
  private calculateMatchScore(action: CommandAction, query: string): number {
    const titleLower = action.title.toLowerCase();
    const subtitleLower = (action.subtitle || '').toLowerCase();

    // 1. Exact match on title (highest priority)
    if (titleLower === query) return 100;

    // 2. Title starts with query
    if (titleLower.startsWith(query)) return 85;

    // 3. Keyword exact match
    if (action.keywords.some((kw) => kw.toLowerCase() === query)) return 75;

    // 4. Acronym match (e.g. "dlq" matches "Dead-Letter Queue")
    const words = titleLower.split(/[\s-]+/);
    const acronym = words.map((w) => w[0]).join('');
    if (acronym.length >= 2 && acronym.includes(query)) return 65;

    // 5. Title contains query
    if (titleLower.includes(query)) return 55;

    // 6. Keyword contains query
    if (action.keywords.some((kw) => kw.toLowerCase().includes(query))) return 45;

    // 7. Metadata inspection (e.g. commitHash, runId, targetFile, failureId)
    if (action.metadata) {
      for (const val of Object.values(action.metadata)) {
        if (typeof val === 'string' && val.toLowerCase().includes(query)) {
          return 40;
        }
      }
    }

    // 8. Subtitle contains query
    if (subtitleLower.includes(query)) return 30;

    // 9. Subsequence fuzzy match (e.g. "prfx" matches "proofix")
    if (query.length >= 3 && this.isSubsequence(query, titleLower)) {
      return 20;
    }

    return 0;
  }

  /**
   * Helper to determine if query is a contiguous or dispersed subsequence of target.
   */
  private isSubsequence(query: string, target: string): boolean {
    let qIdx = 0;
    for (let tIdx = 0; tIdx < target.length && qIdx < query.length; tIdx++) {
      if (query[qIdx] === target[tIdx]) {
        qIdx++;
      }
    }
    return qIdx === query.length;
  }

  public getAction(id: string): CommandAction | undefined {
    return this.actions.get(id);
  }

  public getAllActions(): CommandAction[] {
    return Array.from(this.actions.values());
  }
}

// Global command indexer singleton
export const globalCommandIndexer = new CommandIndexer();
