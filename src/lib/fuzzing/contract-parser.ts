/**
 * OpenAPI / JSON Schema Contract Parser & Endpoint Extractor (Contribution 132)
 */

import type {
  OpenApiSpec,
  EndpointContract,
  ParameterContract,
  RequestBodyContract,
  ResponseContract,
  SchemaPropertyContract,
  HttpMethod,
} from '../types/api-fuzzing.ts';

export interface ParseContractResult {
  valid: boolean;
  spec?: OpenApiSpec;
  endpoints: EndpointContract[];
  errors: string[];
}

/**
 * Resolves local $ref pointers (e.g., "#/components/schemas/UserProfile")
 */
export function resolveSchemaRef(
  schema: any,
  components?: { schemas?: Record<string, any> }
): any {
  if (!schema || typeof schema !== 'object') return schema;

  if (schema.$ref && typeof schema.$ref === 'string') {
    const refPath = schema.$ref;
    if (refPath.startsWith('#/components/schemas/')) {
      const schemaName = refPath.replace('#/components/schemas/', '');
      const target = components?.schemas?.[schemaName];
      if (target) {
        // Recursively resolve nested refs
        return resolveSchemaRef(target, components);
      }
    }
  }

  // Handle properties resolution
  if (schema.properties && typeof schema.properties === 'object') {
    const resolvedProps: Record<string, any> = {};
    for (const [key, prop] of Object.entries(schema.properties)) {
      resolvedProps[key] = resolveSchemaRef(prop, components);
    }
    return { ...schema, properties: resolvedProps };
  }

  // Handle array items resolution
  if (schema.items && typeof schema.items === 'object') {
    return { ...schema, items: resolveSchemaRef(schema.items, components) };
  }

  return schema;
}

/**
 * Normalizes raw schema object to SchemaPropertyContract
 */
export function normalizeSchema(raw: any, components?: any): SchemaPropertyContract {
  if (!raw || typeof raw !== 'object') {
    return { type: 'string' };
  }

  const resolved = resolveSchemaRef(raw, components);

  const contract: SchemaPropertyContract = {
    type: resolved.type || (resolved.properties ? 'object' : 'string'),
    format: resolved.format,
    required: resolved.required,
    minimum: resolved.minimum,
    maximum: resolved.maximum,
    minLength: resolved.minLength,
    maxLength: resolved.maxLength,
    pattern: resolved.pattern,
    enum: Array.isArray(resolved.enum) ? resolved.enum : undefined,
    default: resolved.default,
  };

  if (resolved.items) {
    contract.items = normalizeSchema(resolved.items, components);
  }

  if (resolved.properties && typeof resolved.properties === 'object') {
    contract.properties = {};
    const requiredList: string[] = Array.isArray(resolved.required) ? resolved.required : [];
    for (const [propName, propDef] of Object.entries(resolved.properties)) {
      contract.properties[propName] = {
        ...normalizeSchema(propDef, components),
        required: requiredList.includes(propName),
      };
    }
  }

  return contract;
}

/**
 * Parses parameters array from an OpenAPI operation
 */
function parseParameters(rawParams: any[], components?: any): ParameterContract[] {
  if (!Array.isArray(rawParams)) return [];

  const params: ParameterContract[] = [];

  for (const p of rawParams) {
    if (!p || typeof p !== 'object' || !p.name) continue;

    const resolved = resolveSchemaRef(p, components);
    const schema = resolved.schema ? resolveSchemaRef(resolved.schema, components) : resolved;

    params.push({
      name: resolved.name,
      in: resolved.in || 'query',
      required: Boolean(resolved.required || resolved.in === 'path'),
      type: schema.type || 'string',
      format: schema.format,
      minimum: schema.minimum,
      maximum: schema.maximum,
      minLength: schema.minLength,
      maxLength: schema.maxLength,
      pattern: schema.pattern,
      enum: schema.enum,
      description: resolved.description,
    });
  }

  return params;
}

/**
 * Parses requestBody from an OpenAPI operation
 */
function parseRequestBody(rawBody: any, components?: any): RequestBodyContract | undefined {
  if (!rawBody || typeof rawBody !== 'object') return undefined;

  const resolved = resolveSchemaRef(rawBody, components);
  const content = resolved.content;
  if (!content || typeof content !== 'object') return undefined;

  // Prioritize JSON content type
  const targetType = content['application/json']
    ? 'application/json'
    : Object.keys(content)[0] || 'application/json';

  const mediaTypeObj = content[targetType];
  const rawSchema = mediaTypeObj?.schema;

  return {
    contentType: targetType,
    required: Boolean(resolved.required),
    schema: normalizeSchema(rawSchema, components),
  };
}

/**
 * Parses responses map from an OpenAPI operation
 */
function parseResponses(rawResponses: any, components?: any): Record<string, ResponseContract> {
  const result: Record<string, ResponseContract> = {};
  if (!rawResponses || typeof rawResponses !== 'object') {
    result['200'] = { statusCode: '200', description: 'Success' };
    return result;
  }

  for (const [code, respObj] of Object.entries(rawResponses)) {
    if (!respObj || typeof respObj !== 'object') continue;
    const resolved = resolveSchemaRef(respObj, components);

    let contentType: string | undefined;
    let schema: SchemaPropertyContract | undefined;

    if (resolved.content && typeof resolved.content === 'object') {
      contentType = Object.keys(resolved.content)[0];
      if (contentType && resolved.content[contentType]?.schema) {
        schema = normalizeSchema(resolved.content[contentType].schema, components);
      }
    }

    result[code] = {
      statusCode: code,
      description: resolved.description || `HTTP ${code}`,
      contentType,
      schema,
    };
  }

  return result;
}

const SUPPORTED_HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

/**
 * Parses an OpenAPI 3.0/3.1 document and extracts all endpoint contracts.
 */
export function parseOpenApiContract(rawInput: string | Record<string, any>): ParseContractResult {
  const errors: string[] = [];
  let specObj: any;

  if (typeof rawInput === 'string') {
    try {
      specObj = JSON.parse(rawInput);
    } catch (e: any) {
      return {
        valid: false,
        endpoints: [],
        errors: [`Invalid JSON formatting in OpenAPI document: ${e.message}`],
      };
    }
  } else {
    specObj = rawInput;
  }

  if (!specObj || typeof specObj !== 'object') {
    return {
      valid: false,
      endpoints: [],
      errors: ['OpenAPI document must be a non-null object'],
    };
  }

  const openapiVer = specObj.openapi || specObj.swagger;
  if (!openapiVer) {
    errors.push('Missing "openapi" or "swagger" version declaration');
  }

  const paths = specObj.paths;
  if (!paths || typeof paths !== 'object') {
    return {
      valid: false,
      errors: [...errors, 'OpenAPI document does not define any "paths"'],
      endpoints: [],
    };
  }

  const components = specObj.components || { schemas: specObj.definitions };
  const endpoints: EndpointContract[] = [];

  for (const [rawPath, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== 'object') continue;

    // Path level parameters
    const pathParameters = Array.isArray((pathItem as any).parameters)
      ? parseParameters((pathItem as any).parameters, components)
      : [];

    const normalizedPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;

    for (const method of SUPPORTED_HTTP_METHODS) {
      const lowerMethod = method.toLowerCase();
      const operation = (pathItem as any)[lowerMethod];
      if (!operation || typeof operation !== 'object') continue;

      const opParameters = Array.isArray(operation.parameters)
        ? parseParameters(operation.parameters, components)
        : [];

      // Merge path and operation parameters (operation parameters override path)
      const paramMap = new Map<string, ParameterContract>();
      for (const p of pathParameters) paramMap.set(`${p.in}:${p.name}`, p);
      for (const p of opParameters) paramMap.set(`${p.in}:${p.name}`, p);

      const endpointId = operation.operationId || `ep_${method.toLowerCase()}_${normalizedPath.replace(/[^a-zA-Z0-9]/g, '_')}`;

      endpoints.push({
        id: endpointId,
        path: normalizedPath,
        method,
        summary: operation.summary || `${method} ${normalizedPath}`,
        description: operation.description,
        parameters: Array.from(paramMap.values()),
        requestBody: parseRequestBody(operation.requestBody, components),
        responses: parseResponses(operation.responses, components),
        tags: Array.isArray(operation.tags) ? operation.tags : undefined,
        security: operation.security,
      });
    }
  }

  const spec: OpenApiSpec = {
    openapi: String(openapiVer || '3.0.0'),
    info: {
      title: specObj.info?.title || 'API Specification',
      version: specObj.info?.version || '1.0.0',
      description: specObj.info?.description,
    },
    servers: Array.isArray(specObj.servers) ? specObj.servers : [],
    paths: specObj.paths,
    components: specObj.components,
  };

  return {
    valid: errors.length === 0,
    spec,
    endpoints,
    errors,
  };
}
