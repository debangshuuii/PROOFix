# PROOFix API Specification

The PROOFix REST API enables programmatic project management, automated verification runs, real-time log streaming, regression analysis, and report exports.

**Base URL**: `http://localhost:3000/api/v1`

---

## Authentication & Authorization

All write requests accept optional identity headers:
- `x-user-id`: Caller user identifier (defaults to `usr_default` in local mode).
- `x-user-role`: `user` or `admin`.

When configured, project ownership is enforced to prevent unauthorized mutations.

---

## Endpoints Overview

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Service health status and engine capabilities |
| `GET` | `/ready` | Read-write storage readiness probe |
| `GET` | `/projects` | List all tracked projects |
| `POST` | `/projects` | Register a new project |
| `GET` | `/projects/:id` | Fetch project details, versions, and recent runs |
| `PATCH` | `/projects/:id` | Update project metadata and execution configuration |
| `DELETE` | `/projects/:id` | Remove project and associated test runs |
| `POST` | `/projects/:id/analyze` | Scan codebase structure, framework, and routes |
| `POST` | `/projects/:id/imports/github` | Validate and import GitHub repository |
| `POST` | `/projects/:id/imports/archive` | Upload and unpack `.zip` workspace archive |
| `GET` | `/projects/:id/runs` | List execution runs for project |
| `POST` | `/projects/:id/runs` | Trigger a new verification run |
| `GET` | `/projects/:id/compare` | Compare two runs for regressions and fixes |
| `GET` | `/runs/:id` | Fetch verification run summary and status |
| `GET` | `/runs/:id/stream` | Server-Sent Events (SSE) live progress and logs |
| `POST` | `/runs/:id/cancel` | Terminate running process tree |
| `POST` | `/runs/:id/rerun-failed` | Re-run only failing checks from a previous run |
| `GET` | `/runs/:id/tests` | List detailed test results |
| `GET` | `/runs/:id/findings` | List AI diagnoses and code patch diffs |
| `GET` | `/runs/:id/export` | Export standalone report (`?format=html` or `?format=json`) |
| `GET` | `/settings` | Retrieve system settings and AI configuration |
| `PATCH` | `/settings` | Update AI provider keys and sandbox thresholds |

---

## Detailed Endpoint Reference

### 1. Health & Readiness

#### `GET /health`
Returns current system operational state.

```json
{
  "status": "healthy",
  "product": "PROOFix",
  "tagline": "Don't just generate code. Prove that it works.",
  "version": "1.0.0",
  "timestamp": "2026-10-18T02:00:00.000Z",
  "capabilities": {
    "browserTesting": "Playwright (Chromium)",
    "executionIsolation": "local_process_sandbox",
    "aiProviders": ["gemini", "openai", "anthropic", "deterministic_offline_rule_engine"]
  }
}
```

---

### 2. Projects API

#### `POST /projects`
Creates a new project target.

**Request Payload:**
```json
{
  "name": "My Web App",
  "description": "Production Next.js application",
  "repoUrl": "https://github.com/org/repo",
  "repoProvider": "github",
  "defaultBranch": "main",
  "config": {
    "startupCommand": "npm run dev",
    "buildCommand": "npm run build",
    "port": 3000,
    "readinessPath": "/",
    "timeoutSecs": 45
  }
}
```

---

### 3. Verification Runs API

#### `POST /projects/:id/runs`
Triggers an automated verification run. Spawns the sandbox, conducts browser navigation checks, extracts console/network evidence, and invokes AI failure diagnosis.

**Response:**
```json
{
  "run": {
    "id": "run_1729210000000_abcd",
    "projectId": "proj_1234",
    "status": "pending",
    "runNumber": 3,
    "startedAt": "2026-10-18T02:00:00.000Z",
    "executionConfig": {
      "port": 4173,
      "timeoutMs": 45000
    }
  }
}
```

#### `GET /runs/:id/stream`
Connects via Server-Sent Events (SSE). Streams real-time lifecycle updates and execution log lines.

```
data: {"type":"log","message":"[PROOFix 02:00:01] Starting application server on port 4173..."}

data: {"type":"status","status":"testing"}
```

#### `POST /runs/:id/rerun-failed`
Selectively reruns only the test cases that failed in run `:id`, saving turnaround time and avoiding redundant passes.

---

### 4. Report Export API

#### `GET /runs/:id/export?format=html`
Returns a self-contained, offline-compatible HTML report with embedded styles, test evidence matrices, and unified diff preview cards.

#### `GET /runs/:id/export?format=json`
Returns machine-readable JSON verification output suitable for automated CI gating or external dashboard consumption.
