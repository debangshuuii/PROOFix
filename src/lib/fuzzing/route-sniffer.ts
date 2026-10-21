/**
 * OpenAPI Spec Auto-Synthesizer & Next.js Route Sniffer (Contribution 137)
 */

import fs from 'fs';
import path from 'path';
import type {
  EndpointContract,
  OpenApiSpec,
  HttpMethod,
  ParameterContract,
} from '../types/api-fuzzing.ts';

const HTTP_METHOD_REGEX = /export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g;

/**
 * Converts a Next.js App Router file path into an OpenAPI path template and extracts path parameters.
 * E.g., "src/app/api/v1/runs/[id]/control/route.ts" -> "/api/v1/runs/{id}/control"
 */
export function convertNextPathToOpenApiPath(filePath: string): {
  apiPath: string;
  pathParameters: ParameterContract[];
} {
  // Normalize Windows slashes
  const normalized = filePath.replace(/\\/g, '/');

  // Find index of /api/
  const apiIndex = normalized.indexOf('/api/');
  let subPath = apiIndex !== -1 ? normalized.substring(apiIndex) : normalized;

  // Strip trailing /route.ts, /route.js, /route.tsx
  subPath = subPath.replace(/\/route\.(?:ts|js|tsx|jsx)$/, '');

  const segments = subPath.split('/').filter(Boolean);
  const pathParams: ParameterContract[] = [];

  const convertedSegments = segments.map((seg) => {
    // Catch-all: [...slug]
    if (seg.startsWith('[...') && seg.endsWith(']')) {
      const paramName = seg.slice(4, -1);
      pathParams.push({
        name: paramName,
        in: 'path',
        required: true,
        type: 'string',
        description: `Catch-all path parameter "${paramName}"`,
      });
      return `{${paramName}}`;
    }

    // Dynamic param: [id]
    if (seg.startsWith('[') && seg.endsWith(']')) {
      const paramName = seg.slice(1, -1);
      pathParams.push({
        name: paramName,
        in: 'path',
        required: true,
        type: 'string',
        description: `Dynamic route parameter "${paramName}"`,
      });
      return `{${paramName}}`;
    }

    return seg;
  });

  return {
    apiPath: `/${convertedSegments.join('/')}`,
    pathParameters: pathParams,
  };
}

/**
 * Inspects the source code of a route.ts file and extracts supported HTTP methods.
 */
export function extractHttpMethodsFromSource(sourceCode: string): HttpMethod[] {
  const methods: HttpMethod[] = [];
  let match: RegExpExecArray | null;

  // Reset regex index
  HTTP_METHOD_REGEX.lastIndex = 0;
  while ((match = HTTP_METHOD_REGEX.exec(sourceCode)) !== null) {
    const method = match[1] as HttpMethod;
    if (!methods.includes(method)) {
      methods.push(method);
    }
  }

  return methods;
}

/**
 * Parses a single route.ts file and produces endpoint contracts.
 */
export function parseRouteFileContent(
  filePath: string,
  sourceCode: string
): EndpointContract[] {
  const { apiPath, pathParameters } = convertNextPathToOpenApiPath(filePath);
  const methods = extractHttpMethodsFromSource(sourceCode);
  const endpoints: EndpointContract[] = [];

  for (const method of methods) {
    const endpointId = `ep_${method.toLowerCase()}_${apiPath.replace(/[^a-zA-Z0-9]/g, '_')}`;

    endpoints.push({
      id: endpointId,
      path: apiPath,
      method,
      summary: `${method} ${apiPath}`,
      description: `Auto-discovered from Next.js route: ${filePath}`,
      parameters: [...pathParameters],
      requestBody: ['POST', 'PUT', 'PATCH'].includes(method)
        ? {
            contentType: 'application/json',
            required: false,
            schema: { type: 'object' },
          }
        : undefined,
      responses: {
        '200': { statusCode: '200', description: 'Success response' },
        '400': { statusCode: '400', description: 'Client error' },
        '500': { statusCode: '500', description: 'Server error' },
      },
    });
  }

  return endpoints;
}

/**
 * Recursively searches a directory for Next.js route.ts / route.js files.
 */
export function findRouteFiles(dirPath: string): string[] {
  const results: string[] = [];

  if (!fs.existsSync(dirPath)) return results;

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.next') {
        results.push(...findRouteFiles(fullPath));
      }
    } else if (
      entry.isFile() &&
      /^route\.(?:ts|js|tsx|jsx)$/.test(entry.name)
    ) {
      results.push(fullPath);
    }
  }

  return results;
}

/**
 * Sniffs Next.js App Router endpoints from a project root directory.
 */
export function sniffNextJsRoutes(projectRoot: string): EndpointContract[] {
  const possibleApiDirs = [
    path.join(projectRoot, 'src', 'app', 'api'),
    path.join(projectRoot, 'app', 'api'),
  ];

  const routeFiles: string[] = [];
  for (const d of possibleApiDirs) {
    if (fs.existsSync(d)) {
      routeFiles.push(...findRouteFiles(d));
    }
  }

  const endpoints: EndpointContract[] = [];
  for (const file of routeFiles) {
    try {
      const source = fs.readFileSync(file, 'utf8');
      const found = parseRouteFileContent(file, source);
      endpoints.push(...found);
    } catch {}
  }

  return endpoints;
}

/**
 * Synthesizes an OpenAPI 3.0 specification from a list of EndpointContracts.
 */
export function synthesizeOpenApiSpec(
  endpoints: EndpointContract[],
  title: string = 'Auto-Synthesized API Contract'
): OpenApiSpec {
  const paths: Record<string, any> = {};

  for (const ep of endpoints) {
    if (!paths[ep.path]) paths[ep.path] = {};

    const methodLower = ep.method.toLowerCase();
    paths[ep.path][methodLower] = {
      operationId: ep.id,
      summary: ep.summary,
      description: ep.description,
      parameters: ep.parameters.map((p) => ({
        name: p.name,
        in: p.in,
        required: p.required,
        schema: { type: p.type },
        description: p.description,
      })),
      requestBody: ep.requestBody
        ? {
            required: ep.requestBody.required,
            content: {
              [ep.requestBody.contentType]: {
                schema: ep.requestBody.schema,
              },
            },
          }
        : undefined,
      responses: {
        '200': { description: 'Successful operation' },
      },
    };
  }

  return {
    openapi: '3.0.3',
    info: {
      title,
      version: '1.0.0',
      description: 'Synthesized automatically by PROOFix Endpoint Sniffer',
    },
    paths,
  };
}
