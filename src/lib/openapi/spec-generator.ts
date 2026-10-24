/**
 * Master OpenAPI 3.1 Specification Generator
 *
 * Integrates all domain schemas, endpoint paths, security schemes, and
 * standard HTTP error responses into a compliant OpenAPI 3.1 document.
 */

import type { OpenApiSpec } from '../types/openapi.ts';
import { OPENAPI_SECURITY_SCHEMES, STANDARD_RESPONSES } from './security-schemes.ts';
import { PROJECT_SCHEMAS, PROJECT_PATHS } from './modules/projects.ts';
import { RUN_SCHEMAS, RUN_PATHS } from './modules/runs.ts';
import { FINDING_SCHEMAS, FINDING_PATHS } from './modules/findings.ts';
import { PROPOSAL_SCHEMAS, PROPOSAL_PATHS } from './modules/proposals.ts';
import { SANDBOX_SCHEMAS, SANDBOX_PATHS } from './modules/sandbox.ts';
import { GOVERNANCE_SCHEMAS, GOVERNANCE_PATHS } from './modules/governance.ts';
import { WEBHOOK_SCHEMAS, WEBHOOK_PATHS } from './modules/webhooks.ts';
import { HEALTH_SCHEMAS, HEALTH_PATHS } from './modules/health.ts';
import { CRAWLER_SCHEMAS, CRAWLER_PATHS } from './modules/crawler.ts';
import { FUZZING_SCHEMAS, FUZZING_PATHS } from './modules/fuzzing.ts';
import { REPLAY_SCHEMAS, REPLAY_PATHS } from './modules/replay.ts';
import { COMPANION_SCHEMAS, COMPANION_PATHS } from './modules/companion.ts';
import { PLAYGROUND_SCHEMAS, PLAYGROUND_PATHS } from './modules/playground.ts';

export class OpenApiSpecGenerator {
  /**
   * Builds the complete OpenAPI 3.1.0 specification tree.
   */
  public static generate(): OpenApiSpec {
    return {
      openapi: '3.1.0',
      info: {
        title: 'PROOFix Autonomous Verification & Developer Platform API',
        version: '1.0.0',
        description:
          "Enterprise REST API for triggering Playwright browser verifications, inspecting streaming logs, querying findings, and orchestrating self-healing AST fix proposals.",
        contact: {
          name: 'PROOFix Core Team',
          url: 'https://proofix.dev',
          email: 'support@proofix.dev',
        },
        license: {
          name: 'Apache-2.0',
          url: 'https://www.apache.org/licenses/LICENSE-2.0.html',
        },
      },
      servers: [
        {
          url: '/',
          description: 'Current active host server',
        },
      ],
      tags: [
        { name: 'Projects', description: 'Application repositories, branches, and configs' },
        { name: 'Runs', description: 'Test execution runs and real-time SSE streaming' },
        { name: 'Findings', description: 'Functional regressions, console errors, and step evidence' },
        { name: 'Proposals', description: 'Autonomous AST-backed fix patches and diffs' },
        { name: 'Sandbox', description: 'Linux cgroups v2 resource quotas and microVM containment' },
        { name: 'Governance', description: 'SOC2 Type II SHA-256 tamper-evident audit ledger' },
        { name: 'Webhooks', description: 'Outbound HTTP alert notifications and subscriptions' },
        { name: 'Health', description: 'Kubernetes liveness and readiness probes' },
        { name: 'Crawler', description: 'Autonomous route discovery and deep link discovery' },
        { name: 'Fuzzing', description: 'Automated contract boundary mutations and fuzz probes' },
        { name: 'Replay', description: 'Deterministic HAR network traffic capture and mock replays' },
        { name: 'Companion', description: 'Real-time WebRTC canvas streaming and developer companion' },
        { name: 'Playground', description: 'Zero-setup interactive defect sandboxes and simulation' },
      ],
      paths: {
        ...PROJECT_PATHS,
        ...RUN_PATHS,
        ...FINDING_PATHS,
        ...PROPOSAL_PATHS,
        ...SANDBOX_PATHS,
        ...GOVERNANCE_PATHS,
        ...WEBHOOK_PATHS,
        ...HEALTH_PATHS,
        ...CRAWLER_PATHS,
        ...FUZZING_PATHS,
        ...REPLAY_PATHS,
        ...COMPANION_PATHS,
        ...PLAYGROUND_PATHS,
      },
      components: {
        securitySchemes: OPENAPI_SECURITY_SCHEMES,
        responses: STANDARD_RESPONSES,
        schemas: {
          ...PROJECT_SCHEMAS,
          ...RUN_SCHEMAS,
          ...FINDING_SCHEMAS,
          ...PROPOSAL_SCHEMAS,
          ...SANDBOX_SCHEMAS,
          ...GOVERNANCE_SCHEMAS,
          ...WEBHOOK_SCHEMAS,
          ...HEALTH_SCHEMAS,
          ...CRAWLER_SCHEMAS,
          ...FUZZING_SCHEMAS,
          ...REPLAY_SCHEMAS,
          ...COMPANION_SCHEMAS,
          ...PLAYGROUND_SCHEMAS,
        },
      },
    };
  }

  /**
   * Generates formatted JSON string.
   */
  public static toJson(pretty = true): string {
    return JSON.stringify(OpenApiSpecGenerator.generate(), null, pretty ? 2 : 0);
  }
}
