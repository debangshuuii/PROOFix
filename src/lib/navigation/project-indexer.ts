/**
 * Project Entity Indexer for Command Palette
 *
 * Maps active project entities into searchable CommandAction records with
 * repository identifiers, status badges, and direct navigation links.
 */

import type { CommandAction } from '../types/navigation-palette';
import type { ProjectIndexItem } from '../types/palette-indexing';

export class ProjectIndexer {
  /**
   * Transforms raw project items into indexed command actions.
   */
  public static mapProjectToCommandAction(project: ProjectIndexItem): CommandAction {
    const keywords: string[] = [
      project.name,
      project.id,
      'project',
      'repo',
      'repository',
    ];

    if (project.defaultBranch) {
      keywords.push(project.defaultBranch);
    }

    if (project.description) {
      keywords.push(...project.description.toLowerCase().split(/\s+/).slice(0, 10));
    }

    let badgeText = 'PROJECT';
    if (project.lastRunStatus) {
      badgeText = project.lastRunStatus === 'passed' ? 'PASSED' : project.lastRunStatus === 'failed' ? 'FAILED' : 'RUNNING';
    }

    return {
      id: `project-${project.id}`,
      title: project.name,
      subtitle: project.description || `Branch: ${project.defaultBranch || 'main'} • Active repository`,
      category: 'projects',
      href: `/projects/${project.id}`,
      iconName: 'FolderGit2',
      keywords,
      badge: badgeText,
      actionType: 'navigate',
      status: project.lastRunStatus,
      metadata: {
        projectId: project.id,
        activeRuns: project.activeRunsCount ?? 0,
        updatedAt: project.updatedAt,
      },
    };
  }

  /**
   * Batch converts project entities.
   */
  public static mapProjects(projects: ProjectIndexItem[]): CommandAction[] {
    return projects.map((p) => ProjectIndexer.mapProjectToCommandAction(p));
  }
}
