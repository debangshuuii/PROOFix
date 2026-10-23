/**
 * Test Suite: Multi-Language Code Snippet Generator
 *
 * Verifies code generation syntax for cURL, JavaScript, and Python
 * across GET and POST endpoints with request body payload synthesis.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { CodeSnippetGenerator } from '../src/lib/docs/snippet-generator.ts';

describe('Code Snippet Generator', () => {
  const sampleGetEndpoint = {
    id: 'getProjects',
    path: '/api/v1/projects',
    method: 'GET',
    tag: 'Projects',
    summary: 'List active projects',
    description: 'Returns all projects',
    parameters: [],
    responses: {},
  };

  const samplePostEndpoint = {
    id: 'createProject',
    path: '/api/v1/projects',
    method: 'POST',
    tag: 'Projects',
    summary: 'Create project',
    description: 'Registers a new repo',
    parameters: [],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              name: { type: 'string', example: 'Payment Service' },
              defaultBranch: { type: 'string', example: 'main' },
            },
          },
        },
      },
    },
    responses: {},
  };

  test('should generate valid cURL snippets for GET and POST endpoints', () => {
    // GET
    const getCurl = CodeSnippetGenerator.generate(sampleGetEndpoint, 'curl');
    assert.ok(getCurl.startsWith('curl -X GET "https://api.proofix.dev/api/v1/projects"'));
    assert.ok(getCurl.includes('X-PROOFix-Api-Key'));

    // POST
    const postCurl = CodeSnippetGenerator.generate(samplePostEndpoint, 'curl');
    assert.ok(postCurl.startsWith('curl -X POST'));
    assert.ok(postCurl.includes('-d'));
    assert.ok(postCurl.includes('Payment Service'));
  });

  test('should generate valid JavaScript Fetch snippets', () => {
    const jsSnippet = CodeSnippetGenerator.generate(samplePostEndpoint, 'javascript');
    assert.ok(jsSnippet.includes('await fetch("https://api.proofix.dev/api/v1/projects"'));
    assert.ok(jsSnippet.includes('method: "POST"'));
    assert.ok(jsSnippet.includes('JSON.stringify('));
    assert.ok(jsSnippet.includes('console.log(data)'));
  });

  test('should generate valid Python Requests snippets', () => {
    const pySnippet = CodeSnippetGenerator.generate(samplePostEndpoint, 'python');
    assert.ok(pySnippet.includes('import requests'));
    assert.ok(pySnippet.includes('response = requests.post(url, headers=headers, json=payload)'));
    assert.ok(pySnippet.includes('print(response.json())'));
  });
});
