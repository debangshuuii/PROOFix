/**
 * User Favorites & Recently Visited Subsystems Store (Contribution 188)
 *
 * Tracks user navigation history, favorite modules, and synthesizes
 * personalized command palette recommendations.
 */

import type { RecentVisitItem, CommandAction, NavigationCategory } from '../types/navigation-palette.ts';

export class RecentVisitsStore {
  private recentItems: RecentVisitItem[] = [];
  private favoriteIds: Set<string> = new Set();
  private maxHistory: number;

  constructor(maxHistory: number = 10) {
    this.maxHistory = maxHistory;
  }

  /**
   * Records a user visit, deduplicating and promoting to top.
   */
  public recordVisit(item: Omit<RecentVisitItem, 'visitedAt'>): RecentVisitItem {
    this.recentItems = this.recentItems.filter((existing) => existing.id !== item.id);

    const record: RecentVisitItem = {
      ...item,
      visitedAt: new Date().toISOString(),
    };

    this.recentItems.unshift(record);

    if (this.recentItems.length > this.maxHistory) {
      this.recentItems = this.recentItems.slice(0, this.maxHistory);
    }

    return record;
  }

  /**
   * Toggles favorite status for a navigation ID.
   */
  public toggleFavorite(id: string): boolean {
    if (this.favoriteIds.has(id)) {
      this.favoriteIds.delete(id);
      return false;
    } else {
      this.favoriteIds.add(id);
      return true;
    }
  }

  public isFavorite(id: string): boolean {
    return this.favoriteIds.has(id);
  }

  public getRecentVisits(): RecentVisitItem[] {
    return [...this.recentItems];
  }

  public getFavorites(): string[] {
    return Array.from(this.favoriteIds);
  }

  /**
   * Generates prioritized command palette actions from recent history and favorites.
   */
  public generateRecentActions(): CommandAction[] {
    return this.recentItems.map((item) => {
      const isFav = this.favoriteIds.has(item.id);
      return {
        id: `recent-${item.id}`,
        title: item.title,
        subtitle: isFav ? '★ Favorite - Recent Visit' : 'Recent Visit',
        category: item.category,
        href: item.href,
        iconName: item.iconName,
        keywords: [item.title.toLowerCase(), 'recent'],
        badge: isFav ? '★ Starred' : 'Recent',
        actionType: 'navigate',
      };
    });
  }

  public clear(): void {
    this.recentItems = [];
    this.favoriteIds.clear();
  }
}

export const globalRecentVisitsStore = new RecentVisitsStore();
