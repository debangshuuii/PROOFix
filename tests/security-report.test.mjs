import assert from 'node:assert/strict';
import {
  buildSecurityPreflightReport,
  renderSecurityReportMarkdown,
} from '../src/lib/security/security-report.ts';

console.log('--- Testing Dependency Security Report (Contribution 75) ---');

function testSecurityReportGeneration() {
  const mockInventory = {
    rootPath: '/app',
    ecosystems: ['npm'],
    totalDependencies: 3,
    directCount: 2,
    devCount: 1,
    transitiveCount: 0,
    dependencies: [
      { name: 'lodash', version: '4.17.15', ecosystem: 'npm', type: 'direct', resolvedFrom: 'package.json' },
      { name: 'private-internal-pkg', version: 'latest', ecosystem: 'npm', type: 'direct', resolvedFrom: 'package.json' },
      { name: 'unresolvable-pkg', version: '0.0.0', ecosystem: 'npm', type: 'dev', resolvedFrom: 'package.json' },
    ],
    errors: [],
    generatedAt: new Date().toISOString(),
  };

  const mockRawScan = {
    vulnerabilities: [
      {
        dependency: mockInventory.dependencies[0],
        advisory: {
          id: 'GHSA-p6mc-m468-83gw',
          aliases: ['CVE-2020-8203'],
          summary: 'Prototype Pollution in lodash',
          package: { name: 'lodash', ecosystem: 'npm' },
          affected: [
            {
              package: { name: 'lodash', ecosystem: 'npm' },
              ranges: [{ type: 'ECOSYSTEM', events: [{ introduced: '0' }, { fixed: '4.17.19' }] }],
              database_specific: { severity: 'HIGH', cvss: 7.4 },
            },
          ],
        },
      },
    ],
    uncheckablePackages: [
      {
        name: 'private-internal-pkg',
        version: 'latest',
        reason: 'Unpinned version cannot be matched deterministically.',
      },
      {
        name: 'unresolvable-pkg',
        version: '0.0.0',
        reason: 'Network timeout querying upstream OSV database.',
      },
    ],
    scannedCount: 3,
  };

  const report = buildSecurityPreflightReport({
    projectId: 'proj_demo',
    runId: 'run_100',
    inventory: mockInventory,
    rawScan: mockRawScan,
    gateEvaluation: {
      passed: false,
      blocked: true,
      action: 'block',
      reasons: ['High severity vulnerability in lodash@4.17.15'],
      isIncomplete: false,
      totalVulnerabilities: 1,
      blockingVulnerabilitiesCount: 1,
      totalSecrets: 0,
      blockingSecretsCount: 0,
      evaluatedAt: new Date().toISOString(),
    },
  });

  // Verify "Done when: users can distinguish known findings from packages that could not be checked."
  assert.equal(report.vulnerabilities.length, 1, 'Report must contain exactly 1 known vulnerability');
  assert.equal(report.vulnerabilities[0].packageName, 'lodash');
  assert.equal(report.vulnerabilities[0].severity, 'high');
  assert.equal(report.vulnerabilities[0].fixedIn, '4.17.19');

  assert.equal(report.uncheckablePackages.length, 2, 'Report must contain exactly 2 uncheckable packages');
  assert.equal(report.uncheckablePackages[0].name, 'private-internal-pkg');
  assert.equal(report.uncheckablePackages[1].name, 'unresolvable-pkg');

  // Verify Markdown rendering contains distinct, unambiguous sections
  const markdown = renderSecurityReportMarkdown(report);
  assert.ok(markdown.includes('## 1. Known Vulnerabilities Detected (1)'));
  assert.ok(markdown.includes('## 2. Packages That Could Not Be Checked (2)'));
  assert.ok(markdown.includes('Do NOT assume uncheckable packages are secure'));
  assert.ok(markdown.includes('private-internal-pkg'));
  assert.ok(markdown.includes('unresolvable-pkg'));

  console.log('[PASS] Report clearly distinguishes confirmed vulnerability findings from uncheckable packages.');
}

testSecurityReportGeneration();

console.log('[ALL PASS] Contribution 75 test suite passed.');
