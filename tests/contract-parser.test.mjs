import assert from 'node:assert/strict';
import {
  parseOpenApiContract,
  resolveSchemaRef,
  normalizeSchema,
} from '../src/lib/fuzzing/contract-parser.ts';

console.log('--- Testing OpenAPI / JSON Schema Contract Parser (Contribution 132) ---');

function testRefResolution() {
  const components = {
    schemas: {
      Address: {
        type: 'object',
        properties: {
          city: { type: 'string' },
          zipCode: { type: 'string', pattern: '^\\d{5}$' },
        },
      },
      User: {
        type: 'object',
        required: ['id', 'email'],
        properties: {
          id: { type: 'integer' },
          email: { type: 'string', format: 'email' },
          address: { $ref: '#/components/schemas/Address' },
        },
      },
    },
  };

  const userRef = { $ref: '#/components/schemas/User' };
  const resolved = resolveSchemaRef(userRef, components);

  assert.equal(resolved.type, 'object');
  assert.deepEqual(resolved.required, ['id', 'email']);
  assert.equal(resolved.properties.address.type, 'object');
  assert.equal(resolved.properties.address.properties.city.type, 'string');
  console.log('[PASS] Recursive $ref resolution cleanly dereferences nested schema components.');
}

function testFullOpenApiParsing() {
  const openApiDoc = {
    openapi: '3.0.3',
    info: {
      title: 'Storefront Service API',
      version: '2.1.0',
      description: 'API for e-commerce catalog and cart operations',
    },
    servers: [{ url: 'https://api.storefront.dev/v1' }],
    paths: {
      '/products': {
        get: {
          operationId: 'listProducts',
          summary: 'List products with filtering',
          parameters: [
            {
              name: 'category',
              in: 'query',
              required: false,
              schema: { type: 'string', enum: ['electronics', 'apparel', 'books'] },
            },
            {
              name: 'limit',
              in: 'query',
              required: false,
              schema: { type: 'integer', minimum: 1, maximum: 100 },
            },
          ],
          responses: {
            '200': {
              description: 'List of matching products',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/ProductItem' },
                  },
                },
              },
            },
          },
        },
        post: {
          operationId: 'createProduct',
          summary: 'Create a new product',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['title', 'price'],
                  properties: {
                    title: { type: 'string', minLength: 3, maxLength: 100 },
                    price: { type: 'number', minimum: 0.01 },
                    sku: { type: 'string', pattern: '^[A-Z0-9-]{5,20}$' },
                  },
                },
              },
            },
          },
          responses: {
            '201': { description: 'Product created' },
            '400': { description: 'Invalid payload' },
          },
        },
      },
      '/products/{productId}': {
        parameters: [
          {
            name: 'productId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        get: {
          summary: 'Get product by ID',
          responses: {
            '200': { description: 'Found product' },
            '404': { description: 'Product not found' },
          },
        },
        delete: {
          summary: 'Delete product by ID',
          parameters: [
            {
              name: 'X-Admin-Key',
              in: 'header',
              required: true,
              schema: { type: 'string' },
            },
          ],
          responses: {
            '204': { description: 'Deleted' },
          },
        },
      },
    },
    components: {
      schemas: {
        ProductItem: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            price: { type: 'number' },
          },
        },
      },
    },
  };

  const result = parseOpenApiContract(openApiDoc);
  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
  assert.equal(result.spec.info.title, 'Storefront Service API');
  assert.equal(result.endpoints.length, 4, 'Must parse 4 distinct operations (GET /products, POST /products, GET /products/{id}, DELETE /products/{id})');

  // Verify GET /products
  const listEp = result.endpoints.find((e) => e.id === 'listProducts');
  assert.ok(listEp);
  assert.equal(listEp.method, 'GET');
  assert.equal(listEp.path, '/products');
  assert.equal(listEp.parameters.length, 2);
  const limitParam = listEp.parameters.find((p) => p.name === 'limit');
  assert.ok(limitParam);
  assert.equal(limitParam.type, 'integer');
  assert.equal(limitParam.minimum, 1);
  assert.equal(limitParam.maximum, 100);

  // Verify POST /products requestBody
  const createEp = result.endpoints.find((e) => e.id === 'createProduct');
  assert.ok(createEp);
  assert.equal(createEp.method, 'POST');
  assert.ok(createEp.requestBody);
  assert.equal(createEp.requestBody.contentType, 'application/json');
  assert.equal(createEp.requestBody.required, true);
  assert.equal(createEp.requestBody.schema.properties.title.minLength, 3);
  assert.equal(createEp.requestBody.schema.properties.price.minimum, 0.01);

  // Verify DELETE /products/{productId} (path + header param merge)
  const delEp = result.endpoints.find((e) => e.path === '/products/{productId}' && e.method === 'DELETE');
  assert.ok(delEp);
  assert.equal(delEp.parameters.length, 2);
  const pathParam = delEp.parameters.find((p) => p.name === 'productId');
  const headerParam = delEp.parameters.find((p) => p.name === 'X-Admin-Key');
  assert.ok(pathParam && pathParam.in === 'path');
  assert.ok(headerParam && headerParam.in === 'header');

  console.log('[PASS] Full OpenAPI 3.0 document parsing correctly extracts all operations and schemas.');
}

function testMalformedAndEdgeCases() {
  // Empty or invalid input
  const res1 = parseOpenApiContract('not-json');
  assert.equal(res1.valid, false);
  assert.ok(res1.errors[0].includes('Invalid JSON'));

  // Missing paths
  const res2 = parseOpenApiContract({ openapi: '3.0.0', info: { title: 'Test', version: '1.0' } });
  assert.equal(res2.valid, false);
  assert.ok(res2.errors.some((e) => e.includes('does not define any "paths"')));

  console.log('[PASS] Malformed inputs and missing paths return structured diagnostics safely.');
}

testRefResolution();
testFullOpenApiParsing();
testMalformedAndEdgeCases();

console.log('\nAll Contribution 132 tests passed cleanly!');
