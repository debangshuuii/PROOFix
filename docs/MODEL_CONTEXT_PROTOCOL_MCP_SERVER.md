# Model Context Protocol (MCP) Server Specification

PROOFix exposes a standard Model Context Protocol (MCP) server adhering to the **2024-11-05** protocol version over `stdio` JSON-RPC 2.0.

## Overview
The PROOFix MCP Server turns PROOFix into the automated verification engine for AI coding agents such as:
- Cursor AI
- Claude Code
- Windsurf
- Claude Desktop
- Antigravity

## Starting the Server
```bash
npx proofix mcp
```
Or directly via node:
```bash
node bin/proofix-mcp.js
```

## Registered MCP Tools
| Tool Name | Parameters | Description |
| :--- | :--- | :--- |
| `proofix_verify_workspace` | `profile`, `targetDirectory` | Full automated sandbox verification and Playwright journeys |
| `proofix_run_route` | `route`, `port`, `timeoutSecs` | Targeted route execution auditing 404s and hydration drift |
| `proofix_diagnose_failure` | `errorLog`, `failingRoute` | Distinguishes facts from hypotheses with candidate unified diffs |
| `proofix_prove_patch` | `scenarioId`, `patchDiff` | Dual-Pass Shadow Prover verifying zero regressions |
| `proofix_doctor` | `heal` | Diagnostic check for Node, Playwright, ports, and AI keys |
| `proofix_list_scenarios` | (none) | Lists pre-packaged defect fixtures |
| `proofix_get_report` | `runId` | JSON report for latest verification run |

## Claude Desktop Configuration
Add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "proofix": {
      "command": "node",
      "args": ["d:/Coding/PROOFix/bin/proofix-mcp.js"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
```
