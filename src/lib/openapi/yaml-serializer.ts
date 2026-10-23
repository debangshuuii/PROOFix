/**
 * Lightweight Zero-Dependency OpenAPI YAML Serializer
 *
 * Converts OpenAPI JavaScript objects into valid YAML format
 * supporting nested dictionaries, arrays, multiline strings, and scalar primitives.
 */

export class OpenApiYamlSerializer {
  public static stringify(obj: any, indent = 0): string {
    const spacing = '  '.repeat(indent);

    if (obj === null || obj === undefined) {
      return 'null';
    }

    if (typeof obj === 'number' || typeof obj === 'boolean') {
      return String(obj);
    }

    if (typeof obj === 'string') {
      if (obj.includes('\n')) {
        const lines = obj.split('\n').map((l) => `${spacing}  ${l}`).join('\n');
        return `|\n${lines}`;
      }
      if (
        obj.includes(':') ||
        obj.includes('#') ||
        obj.includes('{') ||
        obj.includes('}') ||
        obj.includes('[') ||
        obj.includes(']') ||
        obj.includes(',') ||
        obj.includes('&') ||
        obj.includes('*') ||
        obj.includes('?') ||
        obj.includes('|') ||
        obj.includes('-') ||
        obj.includes('<') ||
        obj.includes('>') ||
        obj.includes('=') ||
        obj.includes('!') ||
        obj.includes('%') ||
        obj.includes('@') ||
        obj.includes('`')
      ) {
        return JSON.stringify(obj);
      }
      return obj;
    }

    if (Array.isArray(obj)) {
      if (obj.length === 0) return '[]';
      return obj
        .map((item) => {
          if (typeof item === 'object' && item !== null && !Array.isArray(item)) {
            const nested = OpenApiYamlSerializer.stringify(item, indent + 1).trimStart();
            return `\n${spacing}- ${nested}`;
          }
          return `\n${spacing}- ${OpenApiYamlSerializer.stringify(item, indent + 1)}`;
        })
        .join('');
    }

    if (typeof obj === 'object') {
      const keys = Object.keys(obj);
      if (keys.length === 0) return '{}';

      return keys
        .map((key) => {
          const val = obj[key];
          if (typeof val === 'object' && val !== null) {
            if (Array.isArray(val) && val.length > 0) {
              return `\n${spacing}${key}:${OpenApiYamlSerializer.stringify(val, indent + 1)}`;
            }
            if (Object.keys(val).length > 0) {
              return `\n${spacing}${key}:${OpenApiYamlSerializer.stringify(val, indent + 1)}`;
            }
            return `\n${spacing}${key}: ${Array.isArray(val) ? '[]' : '{}'}`;
          }
          return `\n${spacing}${key}: ${OpenApiYamlSerializer.stringify(val, indent + 1)}`;
        })
        .join('');
    }

    return String(obj);
  }
}
