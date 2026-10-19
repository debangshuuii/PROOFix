# Feature 3 — Reusable GitHub Action (Contributions 21–30)

## Overview

The **PROOFix GitHub Action** allows developers to embed automated application verification, dead-link prevention, responsive layout checks, and pixel-level visual regression comparisons directly into their GitHub CI/CD pipelines.

---

## Quick Start

Add the following step to your `.github/workflows/ci.yml`:

```yaml
name: CI Verification

on: [push, pull_request]

permissions:
  contents: read

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run PROOFix Verification
        uses: debangshuuii/PROOFix@v1
        with:
          project-path: '.'
          verification-profile: 'full'
          fail-on-regression: 'true'
```

---

## Action Specification (`action.yml`)

### Inputs

| Input | Description | Required | Default | Allowed Values |
| :--- | :--- | :---: | :---: | :--- |
| `project-path` | Relative or absolute path to the workspace directory. | No | `.` | Directory path string |
| `verification-profile` | Behavioral profile selecting active test checks. | No | `full` | `smoke`, `full`, `visual`, `fast` |
| `report-output` | Directory where JSON, HTML, and markdown reports will be written. | No | `proofix-reports` | Directory path string |
| `fail-on-regression` | Whether detected test failures trigger non-zero exit code (1). | No | `true` | `true`, `false` |
| `timeout-minutes` | Maximum execution duration before timing out. | No | `15` | Integer `1` to `120` |
| `retries` | Maximum retries for transient network or server boot errors. | No | `2` | Integer `0` to `5` |
| `generate-summary` | Whether to write markdown scorecard into `$GITHUB_STEP_SUMMARY`. | No | `true` | `true`, `false` |
| `upload-artifacts` | Whether to package reports, logs, and screenshots into inspectable zip bundle. | No | `true` | `true`, `false` |
| `github-token` | Token for authorized pull request fix generation or annotations. | No | `""` | GitHub Secret or PAT |

### Outputs

| Output | Description |
| :--- | :--- |
| `run-id` | Unique verification execution run identifier. |
| `status` | Overall outcome: `passed`, `failed`, or `error`. |
| `exit-code` | Process exit status: `0` (Success), `1` (Verification Failures), `2` (Execution Error). |
| `passed-checks` | Count of checks that passed successfully. |
| `failed-checks` | Count of checks that failed. |
| `total-checks` | Total count of evaluated checks. |
| `report-path` | Filepath to primary `proofix-report.json`. |
| `summary-markdown` | Markdown table formatted for Step Summaries. |
| `artifacts-bundle` | Filepath to packaged `.zip` artifact archive. |

---

## Exit Code Semantics

The action returns strict, deterministic process exit codes:

- **`0` (Success):** All evaluated verification checks passed cleanly without regressions (or advisory mode active).
- **`1` (Verification Failure):** One or more checks failed or dead link regressions detected when `fail-on-regression: true`.
- **`2` (Execution Error):** Aborted execution due to invalid configuration, missing directories, or timeout.

> **Failure Invariant:** Failed checks are guaranteed never to produce exit code 0 when `fail-on-regression: true`.

---

## Least-Privilege Permissions Policy

| Workflow Purpose | Minimal Permissions |
| :--- | :--- |
| **Read-Only Inspection** (Smoke / Preflight) | `contents: read` |
| **Standard CI Pipeline** (With Step Summary & Artifacts) | `contents: read`, `actions: read` |
| **Self-Healing PR Fixes & Checks** | `contents: read`, `pull-requests: write`, `checks: write` |

---

## Secret Sanitization & Security

All execution logs, error messages, and step summaries undergo automated credential redaction:
- GitHub Personal Access Tokens (`ghp_...`, `github_pat_...`)
- Bearer JWT tokens
- OpenAI and Anthropic API keys (`sk-...`, `sk-ant-...`)
- Database connection strings with embedded passwords (`postgres://...`)
- Injected custom secrets
