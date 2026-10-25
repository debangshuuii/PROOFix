export interface ClaudeDesktopConfig {
  mcpServers: {
    proofix: {
      command: string;
      args: string[];
      env?: Record<string, string>;
    };
  };
}

export class ClaudeDesktopConfigGenerator {
  public static generate(nodeBinary: string = 'node', scriptPath: string = 'bin/proofix-mcp.js'): ClaudeDesktopConfig {
    return {
      mcpServers: {
        proofix: {
          command: nodeBinary,
          args: [scriptPath],
          env: {
            NODE_ENV: 'development',
          }
        }
      }
    };
  }

  public static generateCursorSnippet(): string {
    return JSON.stringify({
      proofix: {
        command: 'node',
        args: ['bin/proofix-mcp.js']
      }
    }, null, 2);
  }
}
