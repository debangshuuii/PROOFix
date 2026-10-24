'use client';

import React, { useState, useMemo } from 'react';
import { Search, SlidersHorizontal, RefreshCw } from 'lucide-react';
import type { DemoScenarioContract, DemoScenarioCategory } from '@/lib/playground/types';
import { ALL_DEMO_SCENARIOS } from '@/lib/playground/registry';
import { PLAYGROUND_CATEGORIES } from '@/lib/playground/constants';
import { PlaygroundScenarioCard } from './PlaygroundScenarioCard';
import { PlaygroundQuickLaunchModal } from './PlaygroundQuickLaunchModal';

interface PlaygroundScenarioSelectorProps {
  initialCategory?: DemoScenarioCategory | 'all';
  className?: string;
}

export function PlaygroundScenarioSelector({
  initialCategory = 'all',
  className = '',
}: PlaygroundScenarioSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<DemoScenarioCategory | 'all'>(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeScenario, setActiveScenario] = useState<DemoScenarioContract | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const categories: Array<{ id: DemoScenarioCategory | 'all'; label: string }> = [
    { id: 'all', label: 'All Scenarios' },
    { id: 'functional_e2e', label: 'E2E Functional' },
    { id: 'framework_react', label: 'React SSR Runtime' },
    { id: 'security_preflight', label: 'DevSecOps Gate' },
  ];

  const filteredScenarios = useMemo(() => {
    return ALL_DEMO_SCENARIOS.filter((s) => {
      const matchesCategory = selectedCategory === 'all' || s.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.title.toLowerCase().includes(q) ||
        s.subtitle.toLowerCase().includes(q) ||
        s.fault.headline.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const handleLaunch = (scenario: DemoScenarioContract) => {
    setActiveScenario(scenario);
    setModalOpen(true);
  };

  const handleInspectDiff = (scenario: DemoScenarioContract) => {
    setActiveScenario(scenario);
    setModalOpen(true);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Search & Category Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 w-full sm:w-auto overflow-x-auto scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-sky-600 text-white shadow-sm shadow-sky-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search Box */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search defects, routes, CWEs..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-white"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Scenarios Grid */}
      {filteredScenarios.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredScenarios.map((scenario) => (
            <PlaygroundScenarioCard
              key={scenario.id}
              scenario={scenario}
              onLaunch={handleLaunch}
              onInspectDiff={handleInspectDiff}
            />
          ))}
        </div>
      ) : (
        <div className="p-12 text-center rounded-2xl border border-slate-800 bg-slate-900/40">
          <SlidersHorizontal className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-white mb-1">No Scenarios Match Your Filter</h4>
          <p className="text-xs text-slate-400 mb-4">
            Try adjusting your search query or selecting &quot;All Scenarios&quot;.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('all');
              setSearchQuery('');
            }}
            className="px-3 py-1.5 text-xs font-semibold text-sky-400 bg-sky-950/60 border border-sky-800/60 rounded-lg hover:bg-sky-900/60 transition-colors inline-flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset Filters
          </button>
        </div>
      )}

      {/* Quick Launch & Diff Modal */}
      <PlaygroundQuickLaunchModal
        scenario={activeScenario}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
