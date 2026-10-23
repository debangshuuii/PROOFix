'use client';

/**
 * Interactive OpenAPI / Swagger Documentation Hub (/docs)
 *
 * Provides a Scalar/Swagger-style interactive reference for all PROOFix REST endpoints
 * across projects, test runs, findings, fix proposals, and sandbox isolation.
 */

import React, { useState, useMemo } from 'react';
import { Navbar } from '@/components/Navbar';
import { DocsHeader } from '@/components/docs/DocsHeader';
import { DocsSidebar } from '@/components/docs/DocsSidebar';
import { DocsSearchBar } from '@/components/docs/DocsSearchBar';
import { EndpointDetailCard } from '@/components/docs/EndpointDetailCard';
import { OpenApiSpecGenerator } from '@/lib/openapi/spec-generator';
import { DocEndpointsIndexer } from '@/lib/docs/endpoints-indexer';
import type { ApiDocEndpoint, HttpMethod } from '@/lib/types/docs';

export default function DocsPage() {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMethod, setSelectedMethod] = useState<HttpMethod | undefined>();
  const [activeEndpointId, setActiveEndpointId] = useState<string | undefined>();
  const [apiKey, setApiKey] = useState<string>('prfx_live_abc123');

  // Index spec endpoints and tags
  const { endpoints, tagGroups } = useMemo(() => {
    const spec = OpenApiSpecGenerator.generate();
    return DocEndpointsIndexer.index(spec);
  }, []);

  // Filter endpoints by search query and HTTP method
  const filteredEndpoints = useMemo(() => {
    let result = DocEndpointsIndexer.search(endpoints, searchQuery);
    if (selectedMethod) {
      result = result.filter((ep) => ep.method === selectedMethod);
    }
    return result;
  }, [endpoints, searchQuery, selectedMethod]);

  const handleSelectEndpoint = (ep: ApiDocEndpoint) => {
    setActiveEndpointId(ep.id);
    const element = document.getElementById(ep.id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-sky-500/20">
      <Navbar />

      <DocsHeader apiKey={apiKey} onChangeApiKey={setApiKey} />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Navigation Sidebar */}
        <div className="hidden lg:block">
          <DocsSidebar
            tagGroups={tagGroups}
            activeEndpointId={activeEndpointId}
            onSelectEndpoint={handleSelectEndpoint}
          />
        </div>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0">
          <DocsSearchBar
            query={searchQuery}
            onChangeQuery={setSearchQuery}
            selectedMethod={selectedMethod}
            onSelectMethod={setSelectedMethod}
            matchCount={filteredEndpoints.length}
          />

          <div className="p-4 sm:p-6 space-y-6 overflow-y-auto">
            {filteredEndpoints.length === 0 ? (
              <div className="p-12 text-center text-slate-500 font-mono text-xs">
                No API endpoints match the filter criteria &quot;{searchQuery}&quot;.
              </div>
            ) : (
              filteredEndpoints.map((ep) => (
                <EndpointDetailCard key={ep.id} endpoint={ep} apiKey={apiKey} />
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
