/**
 * Multi-Method API Endpoint Discoverer & Request Builder
 * Inspects discovered routes, identifies backend API handlers, determines supported
 * HTTP verbs, and constructs standardized request configurations.
 */

import type { DiscoveredRoute } from '../types/index.ts';
import type { HttpMethod, ApiEndpointConfig } from '../types/api-endpoint-agent.ts';

/**
 * Filters and categorizes all API endpoints from the discovered routes list.
 */
export function discoverApiEndpoints(
  routes: DiscoveredRoute[]
): ApiEndpointConfig[] {
  const apiRoutes = routes.filter((r) => r.type === 'api' || r.path.startsWith('/api'));
  const configs: ApiEndpointConfig[] = [];

  for (const route of apiRoutes) {
    const rawMethods: HttpMethod[] = [];
    if (route.method) {
      const upper = route.method.toUpperCase();
      if (['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(upper)) {
        rawMethods.push(upper as HttpMethod);
      }
    }

    if (rawMethods.length === 0) {
      rawMethods.push('GET');
      // If file contains POST or mutate hints, also test POST
      if (route.fileSource?.includes('mutation') || route.path.includes('create') || route.path.includes('add')) {
        rawMethods.push('POST');
      }
    }

    configs.push({
      path: route.path,
      methods: rawMethods,
      timeoutMs: 8000,
      expectedStatusMin: 200,
      expectedStatusMax: 499, // Anything under 500 is non-crashing
      allowEmptyBody: true,
      detectStackTraces: true,
      detectDatabaseErrors: true,
      headers: {
        Accept: 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
      },
    });
  }

  return configs;
}
