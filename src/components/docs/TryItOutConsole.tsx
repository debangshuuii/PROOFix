'use client';

/**
 * Interactive "Try It Out" API Execution Console
 *
 * Dispatches live HTTP requests against local and production endpoints,
 * tracking roundtrip latency, status codes, and formatting response bodies.
 */

import React, { useState } from 'react';
import type { ApiDocEndpoint } from '@/lib/types/docs';
import { Play, Copy, Check, Clock, RefreshCw, Send } from 'lucide-react';

interface TryItOutConsoleProps {
  endpoint: ApiDocEndpoint;
  apiKey?: string;
}

export function TryItOutConsole({ endpoint, apiKey = '' }: TryItOutConsoleProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [pathParams, setPathParams] = useState<Record<string, string>>({});
  const [queryParams, setQueryParams] = useState<Record<string, string>>({});
  const [requestBodyText, setRequestBodyText] = useState<string>(() => {
    if (endpoint.requestBody?.content['application/json']?.schema?.properties) {
      const props = endpoint.requestBody.content['application/json'].schema.properties;
      const exampleObj: Record<string, any> = {};
      for (const [k, v] of Object.entries(props)) {
        exampleObj[k] = v.example ?? (v.type === 'integer' ? 1 : v.type === 'boolean' ? true : 'example');
      }
      return JSON.stringify(exampleObj, null, 2);
    }
    return '';
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);
  const [responseLatencyMs, setResponseLatencyMs] = useState<number | null>(null);
  const [responseBody, setResponseBody] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Extract path parameter names from route (e.g. /projects/{id} -> ['id'])
  const pathParamNames = (endpoint.path.match(/\{([a-zA-Z0-9_]+)\}/g) || []).map((p) =>
    p.replace(/[{}]/g, '')
  );

  const queryParamsList = endpoint.parameters.filter((p) => p.in === 'query');

  const executeRequest = async () => {
    setIsLoading(true);
    setResponseStatus(null);
    setResponseLatencyMs(null);
    setResponseBody(null);

    // Build URL with path substitutions
    let finalUrl = endpoint.path;
    for (const pName of pathParamNames) {
      const val = pathParams[pName] || 'default';
      finalUrl = finalUrl.replace(`{${pName}}`, encodeURIComponent(val));
    }

    // Append query params
    const queryEntries = Object.entries(queryParams).filter(([_, v]) => v.trim() !== '');
    if (queryEntries.length > 0) {
      const qs = new URLSearchParams(queryEntries).toString();
      finalUrl += `?${qs}`;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['X-PROOFix-Api-Key'] = apiKey;
    }

    const options: RequestInit = {
      method: endpoint.method,
      headers,
    };

    if (
      (endpoint.method === 'POST' || endpoint.method === 'PUT' || endpoint.method === 'PATCH') &&
      requestBodyText
    ) {
      options.body = requestBodyText;
    }

    const start = performance.now();
    try {
      const res = await fetch(finalUrl, options);
      const duration = Math.round(performance.now() - start);
      setResponseStatus(res.status);
      setResponseLatencyMs(duration);

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const json = await res.json();
        setResponseBody(JSON.stringify(json, null, 2));
      } else {
        const text = await res.text();
        setResponseBody(text || '(Empty Response)');
      }
    } catch (err: any) {
      const duration = Math.round(performance.now() - start);
      setResponseStatus(0);
      setResponseLatencyMs(duration);
      setResponseBody(`Network / Fetch Error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyResponse = () => {
    if (responseBody) {
      navigator.clipboard?.writeText(responseBody);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden text-xs">
      {/* Header Toggle */}
      <div className="bg-slate-900/80 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Play className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-semibold text-slate-200">Interactive Execution Console</span>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`px-2.5 py-1 rounded text-[11px] font-mono transition ${
            isOpen ? 'bg-slate-800 text-slate-300' : 'bg-emerald-600 hover:bg-emerald-500 text-white font-bold'
          }`}
        >
          {isOpen ? 'Close Console' : 'Try It Out'}
        </button>
      </div>

      {isOpen && (
        <div className="p-4 space-y-4">
          {/* Path Parameters Inputs */}
          {pathParamNames.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Path Parameters
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {pathParamNames.map((pName) => (
                  <div key={pName} className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono text-slate-400">
                      {pName} <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={pathParams[pName] || ''}
                      onChange={(e) => setPathParams({ ...pathParams, [pName]: e.target.value })}
                      placeholder={`Value for ${pName}...`}
                      className="px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs focus:outline-none focus:border-sky-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Query Parameters Inputs */}
          {queryParamsList.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Query Parameters
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {queryParamsList.map((param) => (
                  <div key={param.name} className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono text-slate-400">
                      {param.name} {param.required && <span className="text-rose-400">*</span>}
                    </label>
                    <input
                      type="text"
                      value={queryParams[param.name] || ''}
                      onChange={(e) => setQueryParams({ ...queryParams, [param.name]: e.target.value })}
                      placeholder={`Value for ${param.name}...`}
                      className="px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs focus:outline-none focus:border-sky-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Request Body Editor */}
          {(endpoint.method === 'POST' || endpoint.method === 'PUT' || endpoint.method === 'PATCH') && (
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                JSON Request Body
              </span>
              <textarea
                rows={5}
                value={requestBodyText}
                onChange={(e) => setRequestBodyText(e.target.value)}
                placeholder='{"key": "value"}'
                className="w-full px-3 py-2 rounded bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs focus:outline-none focus:border-sky-500"
              />
            </div>
          )}

          {/* Action Button */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              disabled={isLoading}
              onClick={executeRequest}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-md shadow-emerald-600/20 transition disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Dispatching...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Execute Request</span>
                </>
              )}
            </button>

            {responseStatus !== null && (
              <div className="flex items-center gap-3 font-mono text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500">Status:</span>
                  <span
                    className={`px-2 py-0.5 rounded font-bold ${
                      responseStatus >= 200 && responseStatus < 300
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : responseStatus >= 400
                        ? 'bg-rose-950 text-rose-400 border border-rose-800'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {responseStatus === 0 ? 'CONNECTION FAILED' : responseStatus}
                  </span>
                </div>
                {responseLatencyMs !== null && (
                  <div className="flex items-center gap-1 text-slate-400">
                    <Clock className="w-3 h-3" />
                    <span>{responseLatencyMs}ms</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Response Payload Viewer */}
          {responseBody !== null && (
            <div className="rounded-lg border border-slate-800 bg-slate-950 overflow-hidden mt-3">
              <div className="bg-slate-900/80 px-3 py-1.5 border-b border-slate-800 flex items-center justify-between">
                <span className="font-mono text-[10px] text-slate-400 uppercase">Response Body</span>
                <button
                  type="button"
                  onClick={handleCopyResponse}
                  className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="p-3 max-h-60 overflow-y-auto font-mono text-[11px] leading-relaxed text-slate-300">
                <pre className="whitespace-pre-wrap">{responseBody}</pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
