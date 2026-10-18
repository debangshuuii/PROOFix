import React from 'react';
import { TestStatus, RunStatus, SeverityLevel } from '@/lib/types';
import { CheckCircle2, XCircle, AlertTriangle, Clock, HelpCircle, Loader2 } from 'lucide-react';

interface StatusBadgeProps {
  status: TestStatus | RunStatus | SeverityLevel | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export function StatusBadge({ status, size = 'sm', showIcon = true }: StatusBadgeProps) {
  let bg = 'bg-slate-800 text-slate-300 border-slate-700';
  let icon = <Clock className="w-3.5 h-3.5" />;
  let label = status;

  switch (status) {
    case 'passed':
    case 'success':
    case 'completed':
      bg = 'bg-emerald-950/70 text-emerald-400 border-emerald-800/60';
      icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
      label = status === 'completed' ? 'Completed' : 'Passed';
      break;
    case 'failed':
    case 'error':
    case 'critical':
      bg = 'bg-rose-950/70 text-rose-400 border-rose-800/60';
      icon = <XCircle className="w-3.5 h-3.5 text-rose-400" />;
      label = status === 'critical' ? 'Critical' : 'Failed';
      break;
    case 'high':
      bg = 'bg-orange-950/70 text-orange-400 border-orange-800/60';
      icon = <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />;
      label = 'High Severity';
      break;
    case 'medium':
      bg = 'bg-amber-950/70 text-amber-400 border-amber-800/60';
      icon = <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
      label = 'Medium';
      break;
    case 'inconclusive':
      bg = 'bg-amber-950/70 text-amber-300 border-amber-800/60';
      icon = <HelpCircle className="w-3.5 h-3.5 text-amber-300" />;
      label = 'Inconclusive';
      break;
    case 'blocked':
      bg = 'bg-slate-800 text-slate-400 border-slate-700';
      icon = <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />;
      label = 'Blocked';
      break;
    case 'skipped':
      bg = 'bg-slate-800/80 text-slate-400 border-slate-700';
      icon = <Clock className="w-3.5 h-3.5 text-slate-400" />;
      label = 'Skipped';
      break;
    case 'pending':
    case 'importing':
    case 'analyzing':
    case 'preparing':
    case 'installing':
    case 'building':
    case 'starting':
    case 'testing':
    case 'analyzing_ai':
      bg = 'bg-sky-950/70 text-sky-400 border-sky-800/60 animate-pulse';
      icon = <Loader2 className="w-3.5 h-3.5 text-sky-400 animate-spin" />;
      label = status.replace('_', ' ');
      break;
    case 'cancelled':
      bg = 'bg-zinc-800 text-zinc-400 border-zinc-700';
      icon = <XCircle className="w-3.5 h-3.5 text-zinc-400" />;
      label = 'Cancelled';
      break;
  }

  const sizeClasses = {
    sm: 'text-xs px-2.5 py-0.5 gap-1.5',
    md: 'text-sm px-3 py-1 gap-2',
    lg: 'text-base px-3.5 py-1.5 gap-2.5',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border tracking-wide uppercase ${bg} ${sizeClasses[size]}`}
    >
      {showIcon && icon}
      <span className="capitalize">{label}</span>
    </span>
  );
}
