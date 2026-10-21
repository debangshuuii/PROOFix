'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Home, Copy, Check, Share2 } from 'lucide-react';
import type { BreadcrumbCrumb } from '@/lib/types/navigation-palette';

interface ModuleBreadcrumbProps {
  crumbs: BreadcrumbCrumb[];
  actions?: Array<{
    label: string;
    icon?: React.ElementType;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
  }>;
}

export function ModuleBreadcrumb({ crumbs, actions }: ModuleBreadcrumbProps) {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-3 px-4 bg-slate-900/60 border border-slate-800/80 rounded-lg text-xs">
      {/* Breadcrumb Trail */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 overflow-x-auto max-w-full">
        <Link href="/" className="text-slate-400 hover:text-slate-200 transition flex items-center">
          <Home className="w-3.5 h-3.5" />
        </Link>

        {crumbs.map((crumb, idx) => (
          <React.Fragment key={crumb.label}>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
            {crumb.href && !crumb.active ? (
              <Link
                href={crumb.href}
                className="text-slate-400 hover:text-slate-200 font-medium truncate max-w-[150px] transition"
              >
                {crumb.label}
              </Link>
            ) : (
              <span className={`font-semibold truncate max-w-[180px] ${crumb.active ? 'text-sky-400' : 'text-slate-300'}`}>
                {crumb.label}
              </span>
            )}
          </React.Fragment>
        ))}
      </nav>

      {/* Contextual Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleCopyLink}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-mono transition border border-slate-700"
          title="Copy link to this view"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span>{copied ? 'Copied' : 'Share'}</span>
        </button>

        {actions?.map((act, idx) => {
          const Icon = act.icon;
          return (
            <button
              key={idx}
              onClick={act.onClick}
              className={`flex items-center gap-1.5 px-3 py-1 rounded text-[11px] font-medium transition ${
                act.variant === 'primary'
                  ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-sm'
                  : act.variant === 'danger'
                  ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
              }`}
            >
              {Icon && <Icon className="w-3 h-3" />}
              {act.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
