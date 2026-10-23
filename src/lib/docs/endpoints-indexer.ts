/**
 * Documentation Endpoints Indexer & Tag Grouper
 *
 * Flattens OpenAPI 3.1 specification path items into a searchable collection
 * of ApiDocEndpoint items grouped by category tags.
 */

import type { OpenApiSpec, OpenApiOperation } from '../types/openapi.ts';
import type { ApiDocEndpoint, DocsTagGroup, HttpMethod } from '../types/docs.ts';

export class DocEndpointsIndexer {
  /**
   * Flattens and groups all endpoints by their OpenAPI tags.
   */
  public static index(spec: OpenApiSpec): {
    endpoints: ApiDocEndpoint[];
    tagGroups: DocsTagGroup[];
  } {
    const endpoints: ApiDocEndpoint[] = [];
    const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

    for (const [pathKey, pathItem] of Object.entries(spec.paths)) {
      for (const m of methods) {
        const opKey = m.toLowerCase() as keyof typeof pathItem;
        const op = pathItem[opKey] as OpenApiOperation | undefined;

        if (op) {
          const tag = op.tags && op.tags.length > 0 ? op.tags[0] : 'General';
          const endpoint: ApiDocEndpoint = {
            id: op.operationId || `${m}_${pathKey.replace(/[^a-zA-Z0-9]/g, '_')}`,
            path: pathKey,
            method: m,
            tag,
            summary: op.summary || `${m} ${pathKey}`,
            description: op.description || '',
            parameters: op.parameters || [],
            requestBody: op.requestBody,
            responses: op.responses || {},
            deprecated: op.deprecated,
          };
          endpoints.push(endpoint);
        }
      }
    }

    // Group by tag
    const tagMap = new Map<string, ApiDocEndpoint[]>();
    for (const tag of spec.tags) {
      tagMap.set(tag.name, []);
    }

    for (const ep of endpoints) {
      if (!tagMap.has(ep.tag)) {
        tagMap.set(ep.tag, []);
      }
      tagMap.get(ep.tag)!.push(ep);
    }

    const tagGroups: DocsTagGroup[] = [];
    for (const [tagName, groupEndpoints] of tagMap.entries()) {
      if (groupEndpoints.length > 0) {
        const tagMeta = spec.tags.find((t) => t.name === tagName);
        tagGroups.push({
          name: tagName,
          description: tagMeta?.description,
          endpoints: groupEndpoints,
        });
      }
    }

    return { endpoints, tagGroups };
  }

  /**
   * Filters endpoints by search query.
   */
  public static search(endpoints: ApiDocEndpoint[], query: string): ApiDocEndpoint[] {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return endpoints;

    return endpoints.filter((ep) => {
      return (
        ep.path.toLowerCase().includes(trimmed) ||
        ep.summary.toLowerCase().includes(trimmed) ||
        ep.description.toLowerCase().includes(trimmed) ||
        ep.tag.toLowerCase().includes(trimmed) ||
        ep.method.toLowerCase() === trimmed
      );
    });
  }
}
