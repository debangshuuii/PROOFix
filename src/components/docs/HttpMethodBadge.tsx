'use client';

/**
 * HTTP Method Badge Component
 *
 * Renders distinct color-coded badges for standard HTTP verbs (GET, POST, PUT, DELETE, PATCH).
 */

import React from 'react';
import type { HttpMethod } from '@/lib/types/docs';

interface HttpMethodBadgeProps {
  method: HttpMethod;
  size?: 'sm' | 'md' | 'lg';
}

export function HttpMethodBadge({ method, size = 'md' }: HttpMethodBadgeProps) {
  const colorStyles: Record<HttpMethod, string> = {
    GET: 'bg-sky-950/90 text-sky-400 border-sky-800/80 shadow-sm shadow-sky-500/10',
    POST: 'bg-emerald-950/90 text-emerald-400 border-emerald-800/80 shadow-sm shadow-emerald-500/10',
    PUT: 'bg-indigo-950/90 text-indigo-400 border-indigo-800/80 shadow-sm shadow-indigo-500/10',
    DELETE: 'bg-rose-950/90 text-rose-400 border-rose-800/80 shadow-sm shadow-rose-500/10',
    PATCH: 'bg-amber-950/90 text-amber-400 border-amber-800/80 shadow-sm shadow-amber-500/10',
  };

  const sizeStyles = {
    sm: 'text-[9px] px-1.5 py-0.2 font-mono font-bold',
    md: 'text-[10px] px-2 py-0.5 font-mono font-bold',
    lg: 'text-xs px-2.5 py-1 font-mono font-extrabold',
  };

  return (
    <span
      role="status"
      aria-label={`HTTP ${method} method`}
      className={`inline-flex items-center justify-center rounded border tracking-wider uppercase shrink-0 transition-transform ${
        colorStyles[method] || 'bg-slate-800 text-slate-300 border-slate-700'
      } ${sizeStyles[size]}`}
    >
      {method}
    </span>
  );
}
