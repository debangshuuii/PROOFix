/**
 * Multi-Language Code Snippet Generator
 *
 * Generates ready-to-execute API snippets for cURL, JavaScript Fetch,
 * Python Requests, and Node.js.
 */

import type { ApiDocEndpoint, CodeLanguage } from '../types/docs.ts';

export class CodeSnippetGenerator {
  /**
   * Generates formatted code snippet for the specified language.
   */
  public static generate(
    endpoint: ApiDocEndpoint,
    language: CodeLanguage,
    baseUrl = 'https://api.proofix.dev',
    apiKey = 'prfx_live_abc123'
  ): string {
    const fullUrl = `${baseUrl}${endpoint.path}`;
    const method = endpoint.method;
    const hasBody = method === 'POST' || method === 'PUT' || method === 'PATCH';

    let sampleBody = '';
    if (hasBody && endpoint.requestBody?.content['application/json']?.schema?.properties) {
      const props = endpoint.requestBody.content['application/json'].schema.properties;
      const exampleObj: Record<string, any> = {};
      for (const [k, v] of Object.entries(props)) {
        exampleObj[k] = v.example ?? (v.type === 'integer' ? 1 : v.type === 'boolean' ? true : 'example');
      }
      sampleBody = JSON.stringify(exampleObj, null, 2);
    }

    switch (language) {
      case 'curl':
        return CodeSnippetGenerator.toCurl(method, fullUrl, apiKey, sampleBody);
      case 'javascript':
        return CodeSnippetGenerator.toJavaScript(method, fullUrl, apiKey, sampleBody);
      case 'python':
        return CodeSnippetGenerator.toPython(method, fullUrl, apiKey, sampleBody);
      case 'node':
        return CodeSnippetGenerator.toNode(method, fullUrl, apiKey, sampleBody);
      default:
        return CodeSnippetGenerator.toCurl(method, fullUrl, apiKey, sampleBody);
    }
  }

  private static toCurl(method: string, url: string, apiKey: string, body: string): string {
    let cmd = `curl -X ${method} "${url}" \\\n  -H "X-PROOFix-Api-Key: ${apiKey}" \\\n  -H "Content-Type: application/json"`;
    if (body) {
      const escapedBody = body.replace(/"/g, '\\"');
      cmd += ` \\\n  -d "${escapedBody.replace(/\n/g, '')}"`;
    }
    return cmd;
  }

  private static toJavaScript(method: string, url: string, apiKey: string, body: string): string {
    const options: any = {
      method,
      headers: {
        'X-PROOFix-Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
    };
    if (body) {
      return `const response = await fetch("${url}", {
  method: "${method}",
  headers: {
    "X-PROOFix-Api-Key": "${apiKey}",
    "Content-Type": "application/json"
  },
  body: JSON.stringify(${body.replace(/\n/g, '\n  ')})
});

const data = await response.json();
console.log(data);`;
    }

    return `const response = await fetch("${url}", {
  method: "${method}",
  headers: {
    "X-PROOFix-Api-Key": "${apiKey}",
    "Content-Type": "application/json"
  }
});

const data = await response.json();
console.log(data);`;
  }

  private static toPython(method: string, url: string, apiKey: string, body: string): string {
    const pythonMethod = method.toLowerCase();
    if (body) {
      return `import requests

url = "${url}"
headers = {
    "X-PROOFix-Api-Key": "${apiKey}",
    "Content-Type": "application/json"
}
payload = ${body.replace(/"/g, '"').replace(/\n/g, '\n')}

response = requests.${pythonMethod}(url, headers=headers, json=payload)
print(response.json())`;
    }

    return `import requests

url = "${url}"
headers = {
    "X-PROOFix-Api-Key": "${apiKey}"
}

response = requests.${pythonMethod}(url, headers=headers)
print(response.json())`;
  }

  private static toNode(method: string, url: string, apiKey: string, body: string): string {
    return CodeSnippetGenerator.toJavaScript(method, url, apiKey, body);
  }
}
