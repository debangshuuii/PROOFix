/**
 * Test Suite: OpenAPI 3.1 Specification Validation & Module Coverage
 *
 * Validates spec completeness, schema component references,
 * security definitions, and path item declarations across all 15 REST subsystems.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { OpenApiSpecGenerator } from '../src/lib/openapi/spec-generator.ts';

describe('OpenAPI 3.1 Specification Engine', () => {
  const spec = OpenApiSpecGenerator.generate();

  test('should declare compliant OpenAPI 3.1.0 version and info metadata', () => {
    assert.equal(spec.openapi, '3.1.0');
    assert.ok(spec.info.title.includes('PROOFix'));
    assert.equal(spec.info.version, '1.0.0');
    assert.ok(spec.info.license);
    assert.equal(spec.info.license.name, 'Apache-2.0');
  });

  test('should define all 12 platform tags with descriptions', () => {
    assert.equal(spec.tags.length, 12);
    const tagNames = spec.tags.map((t) => t.name);

    assert.ok(tagNames.includes('Projects'));
    assert.ok(tagNames.includes('Runs'));
    assert.ok(tagNames.includes('Findings'));
    assert.ok(tagNames.includes('Proposals'));
    assert.ok(tagNames.includes('Sandbox'));
    assert.ok(tagNames.includes('Governance'));
    assert.ok(tagNames.includes('Webhooks'));
    assert.ok(tagNames.includes('Health'));
    assert.ok(tagNames.includes('Crawler'));
    assert.ok(tagNames.includes('Fuzzing'));
    assert.ok(tagNames.includes('Replay'));
    assert.ok(tagNames.includes('Companion'));
  });

  test('should register all core and enterprise REST API path items', () => {
    const paths = Object.keys(spec.paths);

    assert.ok(paths.includes('/api/v1/projects'));
    assert.ok(paths.includes('/api/v1/projects/{id}'));
    assert.ok(paths.includes('/api/v1/runs/{id}'));
    assert.ok(paths.includes('/api/v1/runs/{id}/cancel'));
    assert.ok(paths.includes('/api/v1/runs/{id}/stream'));
    assert.ok(paths.includes('/api/v1/runs/{id}/findings'));
    assert.ok(paths.includes('/api/v1/runs/{id}/rerun-failed'));
    assert.ok(paths.includes('/api/v1/proposals'));
    assert.ok(paths.includes('/api/v1/proposals/{id}/apply'));
    assert.ok(paths.includes('/api/v1/sandbox/status'));
    assert.ok(paths.includes('/api/v1/governance/ledger'));
    assert.ok(paths.includes('/api/v1/webhooks'));
    assert.ok(paths.includes('/api/v1/health'));
    assert.ok(paths.includes('/api/v1/ready'));
    assert.ok(paths.includes('/api/v1/crawler/start'));
    assert.ok(paths.includes('/api/v1/fuzzing/probe'));
    assert.ok(paths.includes('/api/v1/replay/session'));
    assert.ok(paths.includes('/api/v1/companion/session'));
  });

  test('should verify security schemes and shared response components', () => {
    const sec = spec.components.securitySchemes;
    assert.ok(sec.BearerAuth);
    assert.equal(sec.BearerAuth.type, 'http');
    assert.equal(sec.BearerAuth.scheme, 'bearer');

    assert.ok(sec.ApiKeyAuth);
    assert.equal(sec.ApiKeyAuth.name, 'X-PROOFix-Api-Key');

    assert.ok(sec.TenantScope);
    assert.equal(sec.TenantScope.name, 'X-Tenant-ID');

    const res = spec.components.responses;
    assert.ok(res.BadRequest);
    assert.ok(res.Unauthorized);
    assert.ok(res.NotFound);
    assert.ok(res.InternalServerError);
  });

  test('should verify schema references resolve to existing components', () => {
    const schemas = spec.components.schemas;
    assert.ok(schemas.Project);
    assert.ok(schemas.VerificationRun);
    assert.ok(schemas.Finding);
    assert.ok(schemas.FixProposal);
    assert.ok(schemas.SandboxMetrics);
    assert.ok(schemas.GovernanceLedgerEntry);
    assert.ok(schemas.WebhookSubscription);
    assert.ok(schemas.HealthStatus);
    assert.ok(schemas.ReadyStatus);
    assert.ok(schemas.CrawlerJob);
    assert.ok(schemas.FuzzingFinding);
    assert.ok(schemas.ReplaySession);
    assert.ok(schemas.CompanionSession);
  });
});
