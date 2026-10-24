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
    name: 'VaultAdmin Directory Demo',
    provider: 'sample_fixture',
    repoUrl: 'https://github.com/demo/vaultadmin-sqli-vulnerability',
    branch: 'main',
    framework: 'nextjs',
    packageManager: 'npm',
    scripts: { dev: 'next dev', build: 'next build', test: 'proofix check' },
    environmentVariables: ['DATABASE_URL', 'AUTH_SECRET'],
    routes: ['/', '/users', '/api/users/search'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  preloadedRun: {
    id: 'run-demo-sql-injection-preflight-baseline',
    projectId: 'prj-demo-sql-injection-preflight',
    status: 'failed',
    summary: {
      totalTests: 5,
      passed: 3,
      failed: 1,
      blocked: 1,
      skipped: 0,
    },
    stages: [
      { name: 'Repository Analysis', status: 'passed', durationMs: 140 },
      { name: 'Dependency Vulnerability Scan', status: 'passed', durationMs: 310 },
      { name: 'AST Security Preflight Gate', status: 'failed', durationMs: 420 },
      { name: 'Secret Redaction Audit', status: 'passed', durationMs: 90 },
      { name: 'Runtime Sandbox Execution', status: 'blocked', durationMs: 0 },
    ],
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
  },
  initialTestResults: [
    {
      id: 't-sqli-1',
      runId: 'run-demo-sql-injection-preflight-baseline',
      name: 'Repository Dependency Preflight Audit',
      category: 'security',
      risk: 'safe_read_only',
      status: 'passed',
      durationMs: 310,
      timestamp: new Date().toISOString(),
    },
    {
      id: 't-sqli-2',
      runId: 'run-demo-sql-injection-preflight-baseline',
      name: 'Security Preflight Gate & AST Policy Audit',
      category: 'security',
      risk: 'safe_read_only',
      status: 'failed',
      durationMs: 420,
      errorMessage: 'CRITICAL_SECURITY_POLICY_VIOLATION: Unsanitized SQL query string interpolation detected in search-route.ts (CWE-89)',
      timestamp: new Date().toISOString(),
    },
    {
      id: 't-sqli-3',
      runId: 'run-demo-sql-injection-preflight-baseline',
      name: 'Secret Leak Redaction & Vault Audit',
      category: 'security',
      risk: 'safe_read_only',
      status: 'passed',
      durationMs: 90,
      timestamp: new Date().toISOString(),
    },
    {
      id: 't-sqli-4',
      runId: 'run-demo-sql-injection-preflight-baseline',
      name: 'API Search Route Live Smoke Check',
      category: 'api',
      risk: 'safe_read_only',
      status: 'blocked',
      durationMs: 0,
      errorMessage: 'Execution blocked by Critical Security Preflight Gate',
      timestamp: new Date().toISOString(),
    },
    {
      id: 't-sqli-5',
      runId: 'run-demo-sql-injection-preflight-baseline',
      name: 'Database Connection Pool Configuration',
      category: 'smoke',
      risk: 'safe_read_only',
      status: 'passed',
      durationMs: 210,
      timestamp: new Date().toISOString(),
    },
  ],
  initialFindings: [
    {
      id: 'f-sqli-1',
      runId: 'run-demo-sql-injection-preflight-baseline',
      type: 'security_violation',
      severity: 'critical',
      title: 'Critical CWE-89 SQL Injection in /api/users/search',
      description: 'Raw string concatenation in SQL query allows arbitrary query execution and unauthorized data extraction.',
      suggestedFix: 'Replace template literal with parameterized query statement and pass parameters as array.',
    },
    {
      id: 'f-sqli-2',
      runId: 'run-demo-sql-injection-preflight-baseline',
      type: 'gate_blocker',
      severity: 'critical',
      title: 'Security Preflight Gate Deployment Blocked',
      description: 'Repository blocked from runtime sandbox deployment due to critical policy failure.',
      suggestedFix: 'Apply parameterized patch to re-enable automated deployment pipeline.',
    },
  ],
};
