'use client';

/**
 * Parameter Table Component
 *
 * Renders path, query, and header parameters in a structured table
 * with required indicators, data types, and default values.
 */

import React from 'react';
import type { OpenApiParameter } from '@/lib/types/openapi';

interface ParameterTableProps {
  parameters: OpenApiParameter[];
}

export function ParameterTable({ parameters }: ParameterTableProps) {
  if (!parameters || parameters.length === 0) {
    return (
      <div className="text-xs text-slate-500 italic py-2">
        No query or path parameters required for this endpoint.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/40 text-xs">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-mono text-[10px] uppercase">
            <th className="py-2 px-3">Parameter</th>
            <th className="py-2 px-3">Location</th>
            <th className="py-2 px-3">Type</th>
            <th className="py-2 px-3">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
          {parameters.map((param) => (
            <tr key={`${param.in}-${param.name}`} className="hover:bg-slate-900/30">
              <td className="py-2 px-3 text-slate-200 font-semibold flex items-center gap-1">
                <span>{param.name}</span>
                {param.required && <span className="text-rose-400 text-xs font-bold">*</span>}
              </td>
              <td className="py-2 px-3">
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 uppercase">
                  {param.in}
                </span>
              </td>
              <td className="py-2 px-3 text-sky-400">
                {param.schema?.type || 'string'}
              </td>
              <td className="py-2 px-3 font-sans text-slate-400">
                {param.description || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
