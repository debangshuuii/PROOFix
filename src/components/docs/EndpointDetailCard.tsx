'use client';

/**
 * Endpoint Detail Card Component
 *
 * Full documentation card uniting HTTP method, URL path, parameters,
 * request/response schemas, live Try-It-Out execution, and multi-language snippets.
 */

import React, { useState } from 'react';
import type { ApiDocEndpoint } from '@/lib/types/docs';
import { HttpMethodBadge } from './HttpMethodBadge';
import { ParameterTable } from './ParameterTable';
import { SchemaViewer } from './SchemaViewer';
import { TryItOutConsole } from './TryItOutConsole';
import { CodeSnippetTabs } from './CodeSnippetTabs';
import { Copy, Check, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

interface EndpointDetailCardProps {
  endpoint: ApiDocEndpoint;
  apiKey?: string;
}

export function EndpointDetailCard({ endpoint, apiKey = '' }: EndpointDetailCardProps) {
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  const handleCopyUrl = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(endpoint.path);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const reqSchema = endpoint.requestBody?.content['application/json']?.schema;
  const successResponse = endpoint.responses['200'] || endpoint.responses['201'];
  const resSchema = successResponse?.content?.['application/json']?.schema;

  return (
    <article
      id={endpoint.id}
      className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden shadow-xl transition-all"
    >
      {/* Card Header */}
      <div
        onClick={() => setIsExpanded((prev) => !prev)}
        className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between cursor-pointer select-none hover:bg-slate-800/60 transition"
      >
        <div className="flex items-center gap-3 flex-wrap">
          <HttpMethodBadge method={endpoint.method} size="md" />
          <span className="font-mono text-sm font-bold text-slate-100">{endpoint.path}</span>
          <button
            type="button"
            onClick={handleCopyUrl}
            title="Copy endpoint path"
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
          >
            {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
            {endpoint.tag}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 hidden sm:inline">{endpoint.summary}</span>
          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-5 space-y-6">
          {/* Description */}
          {endpoint.description && (
            <p className="text-xs text-slate-300 leading-relaxed">{endpoint.description}</p>
          )}

          {endpoint.deprecated && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-950/40 border border-amber-800 text-amber-300 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>This endpoint is deprecated and will be decommissioned in a future API revision.</span>
            </div>
          )}

          {/* Parameters Section */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Parameters</h4>
            <ParameterTable parameters={endpoint.parameters} />
          </div>

          {/* Request Body Section */}
          {reqSchema && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Request Body</h4>
              <SchemaViewer title="Application/JSON Payload" schema={reqSchema} />
            </div>
          )}

          {/* Responses Section */}
          {resSchema && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Response Schema</h4>
              <SchemaViewer title="200/201 Success Response" schema={resSchema} />
            </div>
          )}

          {/* Interactive Try-It-Out Console */}
          <TryItOutConsole endpoint={endpoint} apiKey={apiKey} />

          {/* Code Snippets */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Code Snippets</h4>
            <CodeSnippetTabs endpoint={endpoint} apiKey={apiKey} />
          </div>
        </div>
      )}
    </article>
  );
}
