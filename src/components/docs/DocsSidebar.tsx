'use client';

/**
 * Documentation Sidebar Component
 *
 * Provides organized navigation grouped by OpenAPI tags with
 * color-coded HTTP method badges and active endpoint highlighting.
 */

import React, { useState } from 'react';
import type { DocsTagGroup, ApiDocEndpoint } from '@/lib/types/docs';
import { ChevronDown, ChevronRight, Layers } from 'lucide-react';
import { HttpMethodBadge } from './HttpMethodBadge';

interface DocsSidebarProps {
  tagGroups: DocsTagGroup[];
  activeEndpointId?: string;
  onSelectEndpoint: (endpoint: ApiDocEndpoint) => void;
}

export function DocsSidebar({
  tagGroups,
  activeEndpointId,
  onSelectEndpoint,
}: DocsSidebarProps) {
  const [collapsedTags, setCollapsedTags] = useState<Record<string, boolean>>({});

  const toggleTag = (tagName: string) => {
    setCollapsedTags((prev) => ({ ...prev, [tagName]: !prev[tagName] }));
  };

  return (
    <aside className="w-72 shrink-0 border-r border-slate-800 bg-slate-950/60 p-4 overflow-y-auto max-h-[calc(100vh-64px)] space-y-4">
      <div className="flex items-center gap-2 px-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
        <Layers className="w-3.5 h-3.5 text-sky-400" />
        <span>API Reference</span>
      </div>

      <nav className="space-y-3">
        {tagGroups.map((group) => {
          const isCollapsed = collapsedTags[group.name];

          return (
            <div key={group.name} className="space-y-1">
              {/* Tag Header */}
              <button
                type="button"
                onClick={() => toggleTag(group.name)}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-900 transition"
              >
                <span>{group.name}</span>
                <div className="flex items-center gap-1.5 text-slate-500">
                  <span className="text-[10px] font-mono">{group.endpoints.length}</span>
                  {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </div>
              </button>

              {/* Endpoints List */}
              {!isCollapsed && (
                <div className="space-y-0.5 pl-2 border-l border-slate-800/80 ml-2">
                  {group.endpoints.map((ep) => {
                    const isActive = ep.id === activeEndpointId;

                    return (
                      <button
                        key={ep.id}
                        type="button"
                        onClick={() => onSelectEndpoint(ep)}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] text-left transition font-mono ${
                          isActive
                            ? 'bg-sky-500/15 text-sky-300 font-semibold border border-sky-500/30'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                        }`}
                      >
                        <HttpMethodBadge method={ep.method} size="sm" />
                        <span className="truncate flex-1 font-sans">{ep.summary || ep.path}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
