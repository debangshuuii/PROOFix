import fs from 'fs';
import path from 'path';
import type {
  User,
  Project,
  ProjectVersion,
  VerificationRun,
  TestResult,
  Finding,
  Artifact,
  SystemSettings,
  RunStatus,
  ProjectNotificationSettings,
} from '../types/index.ts';
import type { UserJourney } from '../types/journey.ts';
import { assertValidJourney } from '../journey/schema-validator.ts';
import { getDefaultNotificationSettings } from '../notifications/schema.ts';
import { verifyProjectOwnership } from '../security/ownership.ts';

interface DatabaseSchema {
  users: User[];
  projects: Project[];
  projectVersions: ProjectVersion[];
  runs: VerificationRun[];
  testResults: TestResult[];
  findings: Finding[];
  artifacts: Artifact[];
  settings: SystemSettings;
  journeys: UserJourney[];
  notificationSettings?: Record<string, ProjectNotificationSettings>;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'proofix_db.json');

// Memory cache + write lock
let inMemoryDb: DatabaseSchema | null = null;
let writeQueue: Promise<void> = Promise.resolve();

function getInitialData(): DatabaseSchema {
  const now = new Date().toISOString();
  const sampleProjectId = 'proj_fixture_01';
  const sampleVersionId = 'ver_fixture_01';
  const baselineRunId = 'run_fixture_baseline';

  return {
    users: [
      {
        id: 'usr_default',
        email: 'developer@proofix.dev',
        name: 'Lead Engineer',
        createdAt: now,
      },
    ],
    projects: [
      {
        id: sampleProjectId,
        ownerId: 'usr_default',
        name: 'PROOFix Verification Testbed',
        description:
          'Controlled multi-route web application with known test conditions: working home, broken navigation, 500 API failure, and uncaught JS exception.',
        repoUrl: 'https://github.com/debangshuuii/PROOFix/fixtures/sample-app',
        repoProvider: 'sample_fixture',
        defaultBranch: 'main',
        localPath: 'src/fixtures/sample-app',
        config: {
          startupCommand: 'npm run start',
          buildCommand: 'npm run build',
          installCommand: 'npm install',
          port: 4173,
          readinessPath: '/',
          timeoutSecs: 30,
        },
        createdAt: now,
        updatedAt: now,
      },
    ],
    projectVersions: [
      {
        id: sampleVersionId,
        projectId: sampleProjectId,
        commitHash: 'a1b2c3d4e5f6',
        branch: 'main',
        analysis: {
          framework: 'Next.js 15 (App Router)',
          runtime: 'Node.js v24.x',
          packageManager: 'npm',
          scripts: {
            dev: 'next dev',
            build: 'next build',
            start: 'next start',
            test: 'playwright test',
          },
          entryPoints: ['src/app/page.tsx', 'src/app/layout.tsx'],
          routes: [
            { path: '/', type: 'page', fileSource: 'src/app/page.tsx', isDynamic: false },
            { path: '/about', type: 'page', fileSource: 'src/app/about/page.tsx', isDynamic: false },
            { path: '/broken-route', type: 'page', fileSource: 'src/app/broken-route/page.tsx', isDynamic: false },
            { path: '/api/data', type: 'api', method: 'GET', fileSource: 'src/app/api/data/route.ts', isDynamic: false },
            { path: '/runtime-error', type: 'page', fileSource: 'src/app/runtime-error/page.tsx', isDynamic: false },
          ],
          envVarsDetected: ['DATABASE_URL', 'AUTH_SECRET'],
          existingTests: ['tests/e2e/home.spec.ts'],
          dockerConfig: {
            hasDockerfile: true,
            hasDockerCompose: false,
          },
          inferredStartup: {
            command: 'npm run dev',
            port: 4173,
            readinessPath: '/',
            confidence: 'high',
            rationale: 'Standard Next.js scripts detected with App Router pages.',
          },
          blockers: [
            {
              severity: 'warning',
              message: 'DATABASE_URL detected in schema but not set in execution environment.',
              suggestedResolution: 'Provide a mock or isolated test database connection string.',
            },
          ],
        },
        createdAt: now,
      },
    ],
    runs: [
      {
        id: baselineRunId,
        projectId: sampleProjectId,
        projectVersionId: sampleVersionId,
        runNumber: 1,
        status: 'completed',
        buildStatus: 'success',
        startupStatus: 'success',
        startedAt: new Date(Date.now() - 3600000).toISOString(),
        completedAt: new Date(Date.now() - 3570000).toISOString(),
        durationMs: 30000,
        commitHash: 'a1b2c3d4e5f6',
        branch: 'main',
        executionConfig: {
          isolationMode: 'local_process_sandbox',
          port: 4173,
          timeoutMs: 30000,
        },
        isolationDisclaimer:
          'Local Process Sandbox: Subprocess tree isolation with unprivileged process context, port isolation, and environment secret sanitization. Note: Full container cgroup isolation requires Docker daemon.',
        summary: {
          total: 6,
          passed: 3,
          failed: 2,
          blocked: 0,
          skipped: 0,
          inconclusive: 1,
        },
        errorSummary: '2 checks failed: Broken link 404 navigation and HTTP 500 on /api/data endpoint.',
        logs: [
          '[PROOFix 02:00:00] Initializing verification run #1 for PROOFix Verification Testbed...',
          '[PROOFix 02:00:01] Sandbox mode: local_process_sandbox on port 4173.',
          '[PROOFix 02:00:02] Project inspection verified: 5 routes discovered.',
          '[PROOFix 02:00:03] Starting application server process...',
          '[PROOFix 02:00:07] Readiness probe responded 200 OK at http://localhost:4173/.',
          '[PROOFix 02:00:08] Launching Playwright Chromium headless engine...',
          '[PROOFix 02:00:12] Test 1: Root URL Health Check -> PASSED',
          '[PROOFix 02:00:15] Test 2: Navigation & About Page -> PASSED',
          '[PROOFix 02:00:19] Test 3: Broken Route Link Check -> FAILED (HTTP 404)',
          '[PROOFix 02:00:23] Test 4: API Health Check /api/data -> FAILED (HTTP 500)',
          '[PROOFix 02:00:27] Test 5: Interactive Counter UI Check -> PASSED',
          '[PROOFix 02:00:29] Test 6: Form Validation Safe Check -> INCONCLUSIVE (Form submission blocked by safe policy)',
          '[PROOFix 02:00:30] Run finished with 3 Passed, 2 Failed, 1 Inconclusive.',
        ],
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
    ],
    testResults: [
      {
        id: 'res_01',
        runId: baselineRunId,
        name: 'Root Application Health & Title Check',
        category: 'smoke',
        status: 'passed',
        durationMs: 1420,
        actualResult: 'Root page loaded within 850ms with HTTP 200 and valid DOM hierarchy.',
        evidence: {
          screenshotPath: '/artifacts/baseline_home.png',
          consoleErrors: [],
          networkFailures: [],
          steps: [
            { name: 'Navigate to http://localhost:4173/', status: 'passed', durationMs: 450 },
            { name: 'Verify page status is 200 OK', status: 'passed', durationMs: 50 },
            { name: 'Verify page title contains "PROOFix Testbed"', status: 'passed', durationMs: 20 },
            { name: 'Check main heading visibility', status: 'passed', durationMs: 30 },
          ],
        },
        startedAt: new Date(Date.now() - 3590000).toISOString(),
        completedAt: new Date(Date.now() - 3588500).toISOString(),
      },
      {
        id: 'res_02',
        runId: baselineRunId,
        name: 'Navigation & About Page Flow',
        category: 'user_flow',
        status: 'passed',
        durationMs: 1850,
        actualResult: 'Navigation to /about completed cleanly without console errors.',
        evidence: {
          screenshotPath: '/artifacts/baseline_about.png',
          consoleErrors: [],
          networkFailures: [],
          steps: [
            { name: 'Click header link "About"', status: 'passed', durationMs: 310 },
            { name: 'Wait for URL to update to /about', status: 'passed', durationMs: 180 },
            { name: 'Verify about content renders', status: 'passed', durationMs: 40 },
          ],
        },
        startedAt: new Date(Date.now() - 3588000).toISOString(),
        completedAt: new Date(Date.now() - 3586000).toISOString(),
      },
      {
        id: 'res_03',
        runId: baselineRunId,
        name: 'Internal Link Integrity & 404 Prevention',
        category: 'route_discovery',
        status: 'failed',
        durationMs: 2200,
        actualResult: 'Navigation to /broken-route returned HTTP 404 Not Found.',
        failureCategory: 'navigation_failed',
        errorDetails: {
          message: 'Target route "/broken-route" returned HTTP 404.',
          url: 'http://localhost:4173/broken-route',
          stepFailed: 'Verify navigation target returns HTTP < 400',
        },
        evidence: {
          screenshotPath: '/artifacts/baseline_broken.png',
          consoleErrors: [
            {
              timestamp: '02:00:19',
              type: 'error',
              text: 'Failed to load resource: the server responded with a status of 404 (Not Found)',
              location: 'http://localhost:4173/broken-route',
            },
          ],
          networkFailures: [
            {
              url: 'http://localhost:4173/broken-route',
              method: 'GET',
              status: 404,
              statusText: 'Not Found',
              durationMs: 42,
            },
          ],
          steps: [
            { name: 'Locate broken route anchor link', status: 'passed', durationMs: 110 },
            { name: 'Click link to /broken-route', status: 'passed', durationMs: 190 },
            { name: 'Verify HTTP status code', status: 'failed', durationMs: 45, error: 'Expected status < 400, received 404' },
          ],
        },
        startedAt: new Date(Date.now() - 3585000).toISOString(),
        completedAt: new Date(Date.now() - 3582800).toISOString(),
      },
      {
        id: 'res_04',
        runId: baselineRunId,
        name: 'Backend API Endpoint Health (/api/data)',
        category: 'api_health',
        status: 'failed',
        durationMs: 1650,
        actualResult: 'Endpoint /api/data returned HTTP 500 Internal Server Error.',
        failureCategory: 'http_error',
        errorDetails: {
          message: 'API returned status 500: "Internal Server Error - Database connection refused"',
          url: 'http://localhost:4173/api/data',
          stepFailed: 'Fetch JSON payload from /api/data',
        },
        evidence: {
          screenshotPath: '/artifacts/baseline_api_error.png',
          consoleErrors: [
            {
              timestamp: '02:00:23',
              type: 'error',
              text: 'Fetch failed for http://localhost:4173/api/data (500 Internal Server Error)',
              location: 'api/data/route.ts:14',
            },
          ],
          networkFailures: [
            {
              url: 'http://localhost:4173/api/data',
              method: 'GET',
              status: 500,
              statusText: 'Internal Server Error',
              failureReason: 'ECONNREFUSED 127.0.0.1:5432',
              durationMs: 125,
            },
          ],
          steps: [
            { name: 'Send GET request to /api/data', status: 'passed', durationMs: 130 },
            { name: 'Assert response status is 200', status: 'failed', durationMs: 20, error: 'Received status 500' },
          ],
        },
        startedAt: new Date(Date.now() - 3582000).toISOString(),
        completedAt: new Date(Date.now() - 3580350).toISOString(),
      },
      {
        id: 'res_05',
        runId: baselineRunId,
        name: 'Interactive Counter State & Button Clickability',
        category: 'user_flow',
        status: 'passed',
        durationMs: 1100,
        actualResult: 'Button click incremented state cleanly without exceptions.',
        evidence: {
          screenshotPath: '/artifacts/baseline_counter.png',
          consoleErrors: [],
          networkFailures: [],
          steps: [
            { name: 'Locate counter display', status: 'passed', durationMs: 90 },
            { name: 'Click increment button twice', status: 'passed', durationMs: 250 },
            { name: 'Verify counter displays "Count: 2"', status: 'passed', durationMs: 40 },
          ],
        },
        startedAt: new Date(Date.now() - 3580000).toISOString(),
        completedAt: new Date(Date.now() - 3578900).toISOString(),
      },
      {
        id: 'res_06',
        runId: baselineRunId,
        name: 'Newsletter Subscription Form Validation',
        category: 'form_validation',
        status: 'inconclusive',
        durationMs: 890,
        actualResult: 'Form requires external email delivery service; destructive submission bypassed under Safe Test Policy.',
        evidence: {
          screenshotPath: '/artifacts/baseline_form.png',
          consoleErrors: [],
          networkFailures: [],
          steps: [
            { name: 'Inspect form fields', status: 'passed', durationMs: 120 },
            { name: 'Check client-side HTML5 required constraint', status: 'passed', durationMs: 50 },
            { name: 'Evaluate server submission safety', status: 'skipped', durationMs: 10, error: 'Skipped to prevent unauthenticated outbound webhooks' },
          ],
        },
        startedAt: new Date(Date.now() - 3578000).toISOString(),
        completedAt: new Date(Date.now() - 3577110).toISOString(),
      },
    ],
    findings: [
      {
        id: 'fnd_01',
        runId: baselineRunId,
        testResultId: 'res_03',
        severity: 'high',
        title: 'Broken Navigation Link to Missing Route (/broken-route)',
        description: 'The navigation header or page anchor points to /broken-route which does not exist in the routing manifest, producing a 404 user drop-off.',
        observedEvidence: 'Observed HTTP 404 Not Found response when browser navigated to http://localhost:4173/broken-route.',
        aiHypothesis: 'The developer likely renamed or deleted the broken route or made a typo in the href attribute (e.g., href="/broken-route" instead of a valid route like "/about").',
        suggestedFix: 'Update the anchor href in navigation or create the missing page file at src/app/broken-route/page.tsx.',
        patchPreview: `--- a/src/components/Navigation.tsx
+++ b/src/components/Navigation.tsx
@@ -12,3 +12,3 @@
-<Link href="/broken-route" className="nav-link">Broken Link</Link>
+<Link href="/about" className="nav-link">About Us</Link>`,
        affectedFiles: ['src/components/Navigation.tsx'],
        sideEffects: 'None; routes correctly to existing About page.',
        verificationStep: 'Re-run PROOFix Navigation Flow test to verify 200 OK response.',
        confidenceScore: 95,
        reviewStatus: 'pending',
        createdAt: new Date(Date.now() - 3575000).toISOString(),
      },
      {
        id: 'fnd_02',
        runId: baselineRunId,
        testResultId: 'res_04',
        severity: 'critical',
        title: 'Internal Server Error (500) on API Route /api/data',
        description: 'The endpoint /api/data crashed during request execution due to an unhandled database connection failure.',
        observedEvidence: 'Server returned HTTP 500 with network failure reason "ECONNREFUSED 127.0.0.1:5432".',
        aiHypothesis: 'The database connection pool fails to connect because no PostgreSQL instance is running on localhost:5432, or the DATABASE_URL environment variable is unset/invalid.',
        suggestedFix: 'Add connection error handling with fallback or mock data in development mode when DATABASE_URL is unavailable.',
        patchPreview: `--- a/src/app/api/data/route.ts
+++ b/src/app/api/data/route.ts
@@ -8,3 +8,8 @@
-    const client = await pool.connect();
-    const result = await client.query('SELECT * FROM items');
-    return Response.json(result.rows);
+    try {
+      const client = await pool.connect();
+      const result = await client.query('SELECT * FROM items');
+      return Response.json(result.rows);
+    } catch (err) {
+      console.warn('DB unavailable, returning fallback test fixture:', err);
+      return Response.json({ items: [], fallback: true }, { status: 200 });
+    }`,
        affectedFiles: ['src/app/api/data/route.ts'],
        sideEffects: 'Returns empty fallback payload when database is unreachable instead of crashing with HTTP 500.',
        verificationStep: 'Re-run PROOFix API Health Check to ensure graceful recovery.',
        confidenceScore: 92,
        reviewStatus: 'pending',
        createdAt: new Date(Date.now() - 3574000).toISOString(),
      },
    ],
    artifacts: [],
    settings: {
      aiProvider: 'offline',
      sandboxMemoryLimitMb: 1024,
      sandboxTimeoutSecs: 45,
      allowOutboundNetwork: false,
    },
    journeys: [],
    notificationSettings: {},
  };
}

function recoverHangingRuns(data: DatabaseSchema): boolean {
  let changed = false;
  const activeStates: RunStatus[] = [
    'pending',
    'importing',
    'analyzing',
    'preparing',
    'installing',
    'building',
    'starting',
    'testing',
    'analyzing_ai',
  ];

  for (const run of data.runs) {
    if (activeStates.includes(run.status)) {
      run.status = 'failed';
      run.completedAt = run.completedAt || new Date().toISOString();
      run.errorSummary =
        'Run was interrupted by server restart or process crash; automatically recovered by background resilience engine.';
      run.logs = run.logs || [];
      run.logs.push('[PROOFix Recovery] Detected orphaned execution job on startup. Marked run as failed.');
      changed = true;
    }
  }
  return changed;
}

async function ensureDataFile(): Promise<DatabaseSchema> {
  if (inMemoryDb) return inMemoryDb;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    const initial = getInitialData();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    inMemoryDb = initial;
    return initial;
  }

  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    inMemoryDb = JSON.parse(raw);
    if (!inMemoryDb!.journeys) {
      inMemoryDb!.journeys = [];
    }
    if (!inMemoryDb!.notificationSettings) {
      inMemoryDb!.notificationSettings = {};
    }
    if (recoverHangingRuns(inMemoryDb!)) {
      persist().catch(() => {});
    }
    return inMemoryDb!;
  } catch (err) {
    console.error('Failed reading proofix_db.json, recreating:', err);
    const initial = getInitialData();
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    inMemoryDb = initial;
    return initial;
  }
}

async function persist(): Promise<void> {
  if (!inMemoryDb) return;
  const dataCopy = JSON.stringify(inMemoryDb, null, 2);
  const tempFile = `${DB_FILE}.${Date.now()}.tmp`;

  writeQueue = writeQueue.then(async () => {
    try {
      await fs.promises.writeFile(tempFile, dataCopy, 'utf-8');
      try {
        await fs.promises.rename(tempFile, DB_FILE);
      } catch (renameErr) {
        // Fallback for Windows EPERM file locking
        await fs.promises.copyFile(tempFile, DB_FILE);
        await fs.promises.unlink(tempFile).catch(() => {});
      }
    } catch (err) {
      console.error('Atomic db write error:', err);
      try {
        if (fs.existsSync(tempFile)) await fs.promises.unlink(tempFile);
      } catch {}
    }
  });

  await writeQueue;
}

export const db = {
  async getProjects(): Promise<Project[]> {
    const data = await ensureDataFile();
    return data.projects;
  },

  async getProjectById(id: string): Promise<Project | null> {
    const data = await ensureDataFile();
    return data.projects.find((p) => p.id === id) || null;
  },

  async createProject(project: Project): Promise<Project> {
    const data = await ensureDataFile();
    data.projects.unshift(project);
    await persist();
    return project;
  },

  async updateProject(id: string, updates: Partial<Project>): Promise<Project | null> {
    const data = await ensureDataFile();
    const idx = data.projects.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    data.projects[idx] = {
      ...data.projects[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await persist();
    return data.projects[idx];
  },

  async deleteProject(id: string): Promise<boolean> {
    const data = await ensureDataFile();
    const prevLen = data.projects.length;
    data.projects = data.projects.filter((p) => p.id !== id);
    if (data.projects.length !== prevLen) {
      data.runs = data.runs.filter((r) => r.projectId !== id);
      data.projectVersions = data.projectVersions.filter((v) => v.projectId !== id);
      if (data.notificationSettings && data.notificationSettings[id]) {
        delete data.notificationSettings[id];
      }
      await persist();
      return true;
    }
    return false;
  },

  async getProjectVersions(projectId: string): Promise<ProjectVersion[]> {
    const data = await ensureDataFile();
    return data.projectVersions.filter((v) => v.projectId === projectId);
  },

  async getProjectVersionById(id: string): Promise<ProjectVersion | null> {
    const data = await ensureDataFile();
    return data.projectVersions.find((v) => v.id === id) || null;
  },

  async createProjectVersion(version: ProjectVersion): Promise<ProjectVersion> {
    const data = await ensureDataFile();
    data.projectVersions.unshift(version);
    await persist();
    return version;
  },

  async getRuns(projectId?: string): Promise<VerificationRun[]> {
    const data = await ensureDataFile();
    if (projectId) {
      return data.runs.filter((r) => r.projectId === projectId);
    }
    return data.runs;
  },

  async getRunById(id: string): Promise<VerificationRun | null> {
    const data = await ensureDataFile();
    return data.runs.find((r) => r.id === id) || null;
  },

  async createRun(run: VerificationRun): Promise<VerificationRun> {
    const data = await ensureDataFile();
    data.runs.unshift(run);
    await persist();
    return run;
  },

  async updateRun(id: string, updates: Partial<VerificationRun>): Promise<VerificationRun | null> {
    const data = await ensureDataFile();
    const idx = data.runs.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    data.runs[idx] = {
      ...data.runs[idx],
      ...updates,
    };
    await persist();
    return data.runs[idx];
  },

  async getTestResults(runId: string): Promise<TestResult[]> {
    const data = await ensureDataFile();
    return data.testResults.filter((t) => t.runId === runId);
  },

  async saveTestResults(results: TestResult[]): Promise<void> {
    const data = await ensureDataFile();
    for (const res of results) {
      const idx = data.testResults.findIndex((t) => t.id === res.id);
      if (idx !== -1) {
        data.testResults[idx] = res;
      } else {
        data.testResults.push(res);
      }
    }
    await persist();
  },

  async getFindings(runId: string): Promise<Finding[]> {
    const data = await ensureDataFile();
    return data.findings.filter((f) => f.runId === runId);
  },

  async saveFindings(findings: Finding[]): Promise<void> {
    const data = await ensureDataFile();
    for (const fnd of findings) {
      const idx = data.findings.findIndex((f) => f.id === fnd.id);
      if (idx !== -1) {
        data.findings[idx] = fnd;
      } else {
        data.findings.push(fnd);
      }
    }
    await persist();
  },

  async getArtifacts(runId: string): Promise<Artifact[]> {
    const data = await ensureDataFile();
    return data.artifacts.filter((a) => a.runId === runId);
  },

  async saveArtifact(artifact: Artifact): Promise<Artifact> {
    const data = await ensureDataFile();
    data.artifacts.push(artifact);
    await persist();
    return artifact;
  },

  async getSettings(): Promise<SystemSettings> {
    const data = await ensureDataFile();
    return data.settings;
  },

  async updateSettings(updates: Partial<SystemSettings>): Promise<SystemSettings> {
    const data = await ensureDataFile();
    data.settings = {
      ...data.settings,
      ...updates,
    };
    await persist();
    return data.settings;
  },

  async getJourneys(projectId?: string, requesterUserId?: string): Promise<UserJourney[]> {
    const data = await ensureDataFile();
    let list = data.journeys || [];
    if (projectId) {
      list = list.filter((j) => j.projectId === projectId);
    }
    if (requesterUserId) {
      list = list.filter((j) => j.ownerId === requesterUserId);
    }
    return list;
  },

  async getJourneyById(journeyId: string, requesterUserId?: string): Promise<UserJourney | null> {
    const data = await ensureDataFile();
    const journey = (data.journeys || []).find((j) => j.id === journeyId);
    if (!journey) return null;
    if (requesterUserId && journey.ownerId !== requesterUserId) {
      throw new Error(`Access denied: User "${requesterUserId}" is not authorized to access journey "${journeyId}".`);
    }
    return journey;
  },

  async saveJourney(journey: UserJourney, requesterUserId?: string): Promise<UserJourney> {
    const validated = assertValidJourney(journey);
    const data = await ensureDataFile();
    data.journeys = data.journeys || [];

    const existingIndex = data.journeys.findIndex((j) => j.id === validated.id);
    if (existingIndex !== -1) {
      const existing = data.journeys[existingIndex];
      if (requesterUserId && existing.ownerId !== requesterUserId) {
        throw new Error(`Access denied: User "${requesterUserId}" cannot modify journey owned by "${existing.ownerId}".`);
      }
      data.journeys[existingIndex] = { ...validated, updatedAt: new Date().toISOString() };
    } else {
      data.journeys.push(validated);
    }

    await persist();
    return validated;
  },

  async renameJourney(journeyId: string, newTitle: string, requesterUserId?: string): Promise<UserJourney> {
    const data = await ensureDataFile();
    data.journeys = data.journeys || [];
    const journey = data.journeys.find((j) => j.id === journeyId);
    if (!journey) {
      throw new Error(`Journey with ID "${journeyId}" not found.`);
    }
    if (requesterUserId && journey.ownerId !== requesterUserId) {
      throw new Error(`Access denied: User "${requesterUserId}" cannot rename journey owned by "${journey.ownerId}".`);
    }

    journey.title = newTitle.trim();
    journey.updatedAt = new Date().toISOString();
    assertValidJourney(journey);
    await persist();
    return journey;
  },

  async duplicateJourney(journeyId: string, requesterUserId: string, newTitle?: string): Promise<UserJourney> {
    const existing = await this.getJourneyById(journeyId, requesterUserId);
    if (!existing) {
      throw new Error(`Journey with ID "${journeyId}" not found.`);
    }

    const now = new Date().toISOString();
    const cloned: UserJourney = {
      ...JSON.parse(JSON.stringify(existing)),
      id: `jny_${Date.now()}_clone`,
      ownerId: requesterUserId,
      title: newTitle || `${existing.title} (Copy)`,
      createdAt: now,
      updatedAt: now,
    };

    return await this.saveJourney(cloned, requesterUserId);
  },

  async deleteJourney(journeyId: string, requesterUserId?: string): Promise<boolean> {
    const data = await ensureDataFile();
    data.journeys = data.journeys || [];
    const index = data.journeys.findIndex((j) => j.id === journeyId);
    if (index === -1) return false;

    const existing = data.journeys[index];
    if (requesterUserId && existing.ownerId !== requesterUserId) {
      throw new Error(`Access denied: User "${requesterUserId}" cannot delete journey owned by "${existing.ownerId}".`);
    }

    data.journeys.splice(index, 1);
    await persist();
    return true;
  },

  async getProjectNotificationSettings(
    projectId: string,
    requesterUserId?: string
  ): Promise<ProjectNotificationSettings> {
    const data = await ensureDataFile();
    const project = data.projects.find((p) => p.id === projectId);
    if (!project) {
      throw new Error(`Project with ID "${projectId}" not found.`);
    }

    const authContext = {
      userId: requesterUserId || 'usr_default',
      role: requesterUserId === 'admin' ? ('admin' as const) : ('user' as const),
    };
    const auth = verifyProjectOwnership(project, authContext, 'read');
    if (!auth.authorized) {
      throw new Error(auth.reason || `Unauthorized access to project "${projectId}".`);
    }

    data.notificationSettings = data.notificationSettings || {};
    return data.notificationSettings[projectId] || getDefaultNotificationSettings(projectId);
  },

  async saveProjectNotificationSettings(
    projectId: string,
    settings: ProjectNotificationSettings,
    requesterUserId?: string
  ): Promise<ProjectNotificationSettings> {
    const data = await ensureDataFile();
    const project = data.projects.find((p) => p.id === projectId);
    if (!project) {
      throw new Error(`Project with ID "${projectId}" not found.`);
    }

    const authContext = {
      userId: requesterUserId || 'usr_default',
      role: requesterUserId === 'admin' ? ('admin' as const) : ('user' as const),
    };
    const auth = verifyProjectOwnership(project, authContext, 'write');
    if (!auth.authorized) {
      throw new Error(
        auth.reason ||
          `Unauthorized: User "${requesterUserId}" cannot modify notification settings for project "${projectId}".`
      );
    }

    data.notificationSettings = data.notificationSettings || {};
    data.notificationSettings[projectId] = {
      ...settings,
      projectId,
      updatedAt: new Date().toISOString(),
    };
    await persist();
    return data.notificationSettings[projectId];
  },
};


