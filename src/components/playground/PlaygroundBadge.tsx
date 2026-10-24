'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';

interface PlaygroundBadgeProps {
  label?: string;
  variant?: 'cyan' | 'emerald' | 'amber';
  size?: 'sm' | 'md';
  pulse?: boolean;
  className?: string;
}

export function PlaygroundBadge({
  label = 'Zero-Setup Interactive Demo',
  variant = 'cyan',
  size = 'md',
  pulse = true,
  className = '',
}: PlaygroundBadgeProps) {
  const variantStyles = {
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 shadow-cyan-500/10',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-emerald-500/10',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-amber-500/10',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border shadow-sm backdrop-blur-sm ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      <span className="relative flex h-2 w-2">
        {pulse && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
        )}
        <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
      </span>
      <Sparkles className="w-3 h-3 text-cyan-400" />
      <span>{label}</span>
    </span>
  );
}
