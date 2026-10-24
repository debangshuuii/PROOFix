/**
 * Demo Scenario 3: Unauthenticated SQL Injection in Search Query Preflight
 *
 * Demonstrates AST-backed static analysis catching CWE-89 SQL Injection
 * vulnerabilities during the preflight security gate before code reaches runtime.
 */

import type { DemoScenarioContract } from '../types.ts';

export const SQL_INJECTION_PREFLIGHT_SCENARIO: DemoScenarioContract = {
  id: 'sql_injection_preflight',
  title: 'Unauthenticated SQL Injection in Search Query Preflight',
  subtitle: 'String concatenation in raw SQL query blocks deployment at Security Gate',
  description:
    'Audits an administrative search route. Static AST analysis and dependency security preflight catch unsanitized string concatenation in SQL queries (CWE-89), immediately triggering a Critical Gate Blocker.',
  category: 'security_preflight',
  badge: 'CWE-89 Gate Blocker',
  difficulty: 'Advanced',
  tags: ['DevSecOps', 'CWE-89', 'SQL Injection', 'AST Preflight Gate', 'Auto-Repair'],
  fault: {
    headline: 'Critical CWE-89 SQL Injection vulnerability detected in raw SQL query string',
    technicalSummary:
      'search-route.ts directly interpolates unsanitized query parameter req.nextUrl.searchParams.get("q") into a template string: `SELECT * FROM users WHERE username = \'${q}\'`. The AST policy gate detects unparameterized input and aborts build.',
    faultyFile: 'src/app/api/users/search/route.ts',
    severity: 'critical',
    cveReference: 'CWE-89 (Improper Neutralization of Special Elements used in an SQL Command)',
    expectedFailure: {
      stepName: 'Security Preflight Gate & AST Policy Audit',
      category: 'security',
      expectedStatus: 'failed',
      errorMessage: 'CRITICAL_SECURITY_POLICY_VIOLATION: Unsanitized SQL query string interpolation detected in search-route.ts (CWE-89)',
      detectedStage: 'Security Preflight Gate Validation',
    },
  },
  aiDiagnosis: {
    rootCause: 'Dynamic user query parameter interpolated directly into SQL statement template literal.',
    explanation:
      'AST code scanning intercepted TemplateLiteral expression within database query invocation. Attackers supplying "\' OR 1=1 --" can bypass authentication boundaries or dump sensitive user credentials without authorization.',
    suggestedFix:
      'Rewrite query to use parameterized prepared statement placeholders ($1) with binding array.',
    confidenceScore: 0.99,
  },
  fixProposal: {
    targetFile: 'src/app/api/users/search/route.ts',
    summary: 'Refactor raw string concatenation to parameterized SQL query with bound parameter array.',
    patchDiff: `--- a/src/app/api/users/search/route.ts
+++ b/src/app/api/users/search/route.ts
@@ -6,5 +6,5 @@
   const q = req.nextUrl.searchParams.get('q') || '';
-  const query = \`SELECT * FROM users WHERE username = '\${q}'\`;
-  const results = await db.query(query);
+  const query = 'SELECT id, username, email, role FROM users WHERE username = $1';
+  const results = await db.query(query, [q]);
   return NextResponse.json({ users: results.rows });`,
  },
  benchmark: {
    detectionTimeMs: 420,
    aiDiagnosisConfidence: 0.99,
    patchGenerationTimeMs: 290,
    verificationPassRate: 1.0,
    zeroConfigRating: '10/10 Instant',
  },
  seedProject: {
    id: 'prj-demo-sql-injection-preflight',
    ownerId: 'usr_default',
    name: 'VaultAdmin Directory Demo',
    description: 'Internal administrative user directory with AST policy enforcement.',
    repoUrl: 'https://github.com/demo/vaultadmin-sqli-vulnerability',
    repoProvider: 'sample_fixture',
    defaultBranch: 'main',
    config: {
      startupCommand: 'npm run start',
      buildCommand: 'npm run build',
      port: 3000,
      timeoutSecs: 30,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  preloadedRun: {
    id: 'run-demo-sql-injection-preflight-baseline',
    projectId: 'prj-demo-sql-injection-preflight',
    projectVersionId: 'ver_demo_sqli',
    runNumber: 1,
    status: 'failed',
    buildStatus: 'failed',
    startupStatus: 'skipped',
    commitHash: 'sqli89e5f6',
    branch: 'main',
    executionConfig: {
      isolationMode: 'local_process_sandbox',
      port: 3000,
      timeoutMs: 30000,
    },
    isolationDisclaimer: 'Execution conducted in process sandbox',
    summary: {
      total: 5,
      passed: 3,
      failed: 1,
      blocked: 1,
      skipped: 0,
      inconclusive: 0,
    },
    logs: [
      '[preflight] Commencing AST static analysis across 14 routes...',
      '[ast-scanner] Analyzing database query invocations in src/app/api/users/search/route.ts',
      '[security-gate] CRITICAL VIOLATION: TemplateLiteral string concatenation in db.query()',
      '[security-gate] Identified vulnerability type: CWE-89 (SQL Injection)',
      '[policy] Zero-Tolerance Security Gate tripped. Aborting runtime container deployment.',
      '[diagnoser] Formulating parameterized query patch with 99% confidence score...',
    ],
    startedAt: new Date(Date.now() - 60000).toISOString(),
    completedAt: new Date().toISOString(),
    createdAt: new Date(Date.now() - 60000).toISOString(),
  },
  initialTestResults: [
    {
      id: 't-sqli-1',
      runId: 'run-demo-sql-injection-preflight-baseline',
      name: 'Repository Dependency Preflight Audit',
      category: 'smoke',
      status: 'passed',
      durationMs: 310,
      actualResult: 'Package dependencies scanned: 0 known CVEs found',
      evidence: { consoleErrors: [], networkFailures: [], steps: [] },
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    },
    {
      id: 't-sqli-2',
      runId: 'run-demo-sql-injection-preflight-baseline',
      name: 'Security Preflight Gate & AST Policy Audit',
      category: 'smoke',
      status: 'failed',
      durationMs: 420,
      actualResult: 'CRITICAL_SECURITY_POLICY_VIOLATION: Unsanitized SQL query string interpolation detected',
      errorDetails: {
        message: 'CRITICAL_SECURITY_POLICY_VIOLATION: Unsanitized SQL query string interpolation detected in search-route.ts (CWE-89)',
      },
      evidence: { consoleErrors: [], networkFailures: [], steps: [] },
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    },
    {
      id: 't-sqli-3',
      runId: 'run-demo-sql-injection-preflight-baseline',
      name: 'Secret Leak Redaction & Vault Audit',
      category: 'smoke',
      status: 'passed',
      durationMs: 90,
      actualResult: 'Environment scan complete: all secrets correctly redacted',
      evidence: { consoleErrors: [], networkFailures: [], steps: [] },
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    },
    {
      id: 't-sqli-4',
      runId: 'run-demo-sql-injection-preflight-baseline',
      name: 'API Search Route Live Smoke Check',
      category: 'api_health',
      status: 'blocked',
      durationMs: 0,
      actualResult: 'Execution blocked by Critical Security Preflight Gate',
      errorDetails: {
        message: 'Execution blocked by Critical Security Preflight Gate',
      },
      evidence: { consoleErrors: [], networkFailures: [], steps: [] },
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    },
    {
      id: 't-sqli-5',
      runId: 'run-demo-sql-injection-preflight-baseline',
      name: 'Database Connection Pool Configuration',
      category: 'smoke',
      status: 'passed',
      durationMs: 210,
      actualResult: 'Connection pool parameters validated for PostgreSQL and SQLite',
      evidence: { consoleErrors: [], networkFailures: [], steps: [] },
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    },
  ],
  initialFindings: [
    {
      id: 'f-sqli-1',
      runId: 'run-demo-sql-injection-preflight-baseline',
      severity: 'critical',
      title: 'Critical CWE-89 SQL Injection in /api/users/search',
      description: 'Raw string concatenation in SQL query allows arbitrary query execution and unauthorized data extraction.',
      observedEvidence: 'Static AST inspection found template literal with req.nextUrl.searchParams in db.query call.',
      aiHypothesis: 'Direct query interpolation permits authentication bypass and data extraction.',
      suggestedFix: 'Replace template literal with parameterized query statement and pass parameters as array.',
      confidenceScore: 99,
      reviewStatus: 'pending',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'f-sqli-2',
      runId: 'run-demo-sql-injection-preflight-baseline',
      severity: 'critical',
      title: 'Security Preflight Gate Deployment Blocked',
      description: 'Repository blocked from runtime sandbox deployment due to critical policy failure.',
      observedEvidence: 'Build status set to failed and runtime container launch blocked.',
      aiHypothesis: 'Security policy requires 0 critical findings before container execution.',
      suggestedFix: 'Apply parameterized patch to re-enable automated deployment pipeline.',
      confidenceScore: 99,
      reviewStatus: 'pending',
      createdAt: new Date().toISOString(),
    },
  ],
};
