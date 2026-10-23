'use client';

/**
 * Schema Viewer Component
 *
 * Inspects JSON request/response schemas with interactive toggle
 * between structured property definitions and sample JSON examples.
 */

import React, { useState } from 'react';
import type { OpenApiSchema } from '@/lib/types/openapi';

interface SchemaViewerProps {
  title?: string;
  schema?: OpenApiSchema;
}

export function SchemaViewer({ title = 'Schema', schema }: SchemaViewerProps) {
  const [viewMode, setViewMode] = useState<'properties' | 'example'>('properties');

  if (!schema) {
    return null;
  }

  // Generate example JSON from schema properties
  const generateExample = (s: OpenApiSchema): any => {
    if (s.example !== undefined) return s.example;
    if (s.properties) {
      const obj: Record<string, any> = {};
      for (const [k, v] of Object.entries(s.properties)) {
        obj[k] = generateExample(v);
      }
      return obj;
    }
    if (s.type === 'array' && s.items) {
      return [generateExample(s.items)];
    }
    if (s.type === 'integer' || s.type === 'number') return 1;
    if (s.type === 'boolean') return true;
    return 'string';
  };

  const exampleJson = JSON.stringify(generateExample(schema), null, 2);

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/60 overflow-hidden text-xs">
      {/* Header with Mode Toggle */}
      <div className="bg-slate-900/60 px-3 py-1.5 border-b border-slate-800 flex items-center justify-between">
        <span className="font-semibold text-slate-300 font-mono text-[11px]">{title}</span>
        <div className="flex items-center gap-1 font-mono text-[10px]">
          <button
            type="button"
            onClick={() => setViewMode('properties')}
            className={`px-2 py-0.5 rounded transition ${
              viewMode === 'properties' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Properties
          </button>
          <button
            type="button"
            onClick={() => setViewMode('example')}
            className={`px-2 py-0.5 rounded transition ${
              viewMode === 'example' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Example JSON
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        {viewMode === 'example' ? (
          <pre className="font-mono text-[11px] leading-relaxed text-slate-300 overflow-x-auto">
            {exampleJson}
          </pre>
        ) : (
          <div className="space-y-2">
            {schema.properties ? (
              Object.entries(schema.properties).map(([propName, propSchema]) => {
                const isRequired = schema.required?.includes(propName);
                return (
                  <div key={propName} className="font-mono text-[11px] border-b border-slate-900/80 pb-1.5 last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200">{propName}</span>
                      {isRequired && <span className="text-rose-400 font-bold">*</span>}
                      <span className="text-[10px] text-sky-400">{propSchema.type || 'any'}</span>
                    </div>
                    {propSchema.description && (
                      <p className="font-sans text-[11px] text-slate-400 mt-0.5">{propSchema.description}</p>
                    )}
                  </div>
                );
              })
            ) : (
              <span className="text-slate-500 italic">Type: {schema.type || 'object'}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
