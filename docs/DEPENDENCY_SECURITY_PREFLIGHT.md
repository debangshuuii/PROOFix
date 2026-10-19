# Dependency & Security Preflight (Feature 8)

## Overview

PROOFix includes an integrated **Dependency & Security Preflight** verification engine designed to detect known vulnerable dependencies and accidentally committed secrets **before** launching sandboxes, running builds, or executing user projects.

Preflight operates completely offline-safe by default, performs strictly non-executing static analysis, redacts all detected credentials at the source, and provides deterministic security gate policies to prevent compromised or vulnerable code from running unchecked.

---

## Architecture & Contributions (71–80)

| Contribution | Module | Responsibility |
|---|---|---|
| **71** | `ecosystem-detector.ts` | Detects package manifests and lockfiles for supported ecosystems (`npm`, `pypi`) and flags unsupported/missing manifests. |
| **72** | `dependency-inventory.ts` | Extracts dependencies, versions, ecosystems, and dependency types statically without executing project scripts. |
| **73** | `vulnerability-scanner.ts` | Scans dependency inventory against OSV-compatible vulnerability databases (built-in curated DB + optional live OSV lookup). |
| **74** | `vulnerability-normalizer.ts` | Maps raw scanner advisories to a uniform report schema with CVSS severity, patched versions, and remediation guidance. |
| **75** | `security-report.ts` / UI | Generates consolidated preflight reports and UI cards distinguishing confirmed findings from uncheckable packages. |
| **76** | `secret-scanner.ts` | Detects high-entropy tokens and credentials (AWS, GitHub, OpenAI, Google, Slack, Private Keys, DB URIs) with binary filters. |
| **77** | `secret-redaction.ts` | Enforces zero-exposure redaction across reports, API responses, logs, and test suites. |
| **78** | `security-gate.ts` | Provides configurable, deterministic security gate policies and prevents incomplete scans from being falsely marked clean. |
| **79** | `scanner-hardening.ts` | Enforces timeouts, resource bounds, safe temporary storage isolation, and explicit consent for external metadata lookups. |
| **80** | `tests/verify-security-preflight-ci.mjs` | Master CI regression suite covering all 10 contributions using synthetic fixtures and zero-leakage assertions. |

---

## 1. Ecosystem Detection (Contribution 71)

The preflight engine identifies project manifests and lockfiles to determine the appropriate analysis strategy:

- **Supported Ecosystems**:
  - **npm**: `package.json`, `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `bun.lockb`
  - **PyPI (Python)**: `requirements.txt`, `pyproject.toml`, `poetry.lock`, `Pipfile.lock`
- **Unsupported Ecosystems**:
  - Automatically identifies and logs manifests from unsupported ecosystems (e.g. `Cargo.toml` for Rust, `pom.xml` / `build.gradle` for Java, `go.mod` for Go, `composer.json` for PHP, `Gemfile` for Ruby) with clear upgrade path recommendations.
- **Missing Manifests**:
  - Correctly reports projects lacking recognizable package manifests without throwing runtime errors.

---

## 2. Dependency Inventory Generation (Contribution 72)

To ensure security while analyzing untrusted repositories:
- **Zero Script Execution Guarantee**: Manifests and lockfiles are parsed purely as static data (JSON and text parsing). PROOFix **never** executes package lifecycle scripts (`preinstall`, `postinstall`, `setup.py`, etc.) during inventory generation.
- **Lockfile Format Support**:
  - npm `package-lock.json` v1 (`dependencies` tree), v2, and v3 (`packages` map).
  - Python `requirements.txt` (handles version specifiers `==`, `>=`, `<=`, comments, and line continuation).
- **Safe Malformed Handling**: Malformed or truncated manifest files do not crash the runner; they record descriptive error messages in `inventory.errors` and continue scanning intact files.

---

## 3. Vulnerability Scanning & Normalization (Contributions 73 & 74)

Dependency items are cross-referenced with OSV (Open Source Vulnerabilities) advisories:
- **Built-in Curated OSV Database**: Ships with an offline-first database of known vulnerabilities (e.g., prototype pollution in `lodash` < 4.17.19, ReDoS in `minimist` < 0.2.1, CRLF injection in `urllib3` < 1.26.5) ensuring deterministic behavior in disconnected CI environments.
- **Normalized Schema**:
  - Advisory identifiers (`GHSA-...`, `CVE-...`, `PYSEC-...`)
  - Normalized severity rating: `critical`, `high`, `medium`, `low`, `info` (calculated from CVSS v3/v2 scores when available)
  - Patched and fixed-in versions
  - Plain-text remediation guidance (e.g. `"Upgrade lodash from 4.17.15 to fixed version >= 4.17.19."`)

---

## 4. Security Preflight Report & UI (Contribution 75)

The preflight report maintains a strict distinction between:
1. **Confirmed Vulnerabilities**: Known advisories affecting specific resolved package versions.
2. **Uncheckable Packages**: Wildcard versions (e.g., `*`, `latest`) or packages from unsupported registries that cannot be deterministically validated against vulnerability databases.

The interactive `<SecurityPreflightCard />` component displays:
- Overall Gate Status (`PROCEED`, `WARN`, `BLOCKED`)
- Severity breakdown chips (Critical, High, Medium, Low)
- Detected secret counts with file and line locations
- Uncheckable dependency list with clear reasons
- Remediation buttons to apply recommended upgrades

---

## 5. Secret Pattern Scanning & Redaction (Contributions 76 & 77)

PROOFix scans project source code and configuration files for accidentally committed credentials:
- **Supported Secret Detectors**:
  - AWS Access Key ID (`AKIA...`) and Secret Access Key
  - GitHub Personal Access Tokens (`ghp_...`, `gho_...`, `github_pat_...`)
  - OpenAI API Keys (`sk-...`, `sk-proj-...`)
  - Google API Keys (`AIza...`)
  - Slack Bot & User Tokens (`xoxb-...`, `xoxp-...`) and Webhooks
  - Private Key Headers (`BEGIN RSA PRIVATE KEY`, `BEGIN OPENSSH PRIVATE KEY`, etc.)
  - Database Connection Strings (`postgres://...`, `mysql://...`, `mongodb://...`)
- **Binary & Size Filtering**:
  - Binary files are automatically identified and skipped using a null-byte inspection algorithm and binary file extension filters.
  - Large files (> 1 MB) are skipped to avoid memory exhaustion.
- **Zero-Exposure Redaction Guarantee**:
  - The raw secret value is **never** stored in the `SecretFinding` object.
  - Excerpts are masked using prefix/suffix retaining masks (e.g., `ghp_****...****ab`).
  - `sanitizeLogOutput()` and `sanitizeReportForApiResponse()` strip raw secrets before any logging or API transmission.

---

## 6. Configurable Security Gate Policies (Contribution 78)

Security gates determine whether a verification run can proceed:

```typescript
export interface SecurityGatePolicy {
  // Severity threshold that produces a run block: 'critical' | 'high' | 'medium' | 'low' | 'none'
  blockOnVulnerabilitySeverity: VulnerabilitySeverity | 'none'; // Default: 'critical'

  // Whether exposed secrets block verification
  blockOnSecrets: boolean; // Default: true

  // If false, incomplete scans (due to scanner errors or uncheckable deps) block the run
  allowIncompleteScans: boolean; // Default: false

  // Whitelisted advisory IDs (e.g. ['GHSA-xxxx-xxxx'])
  ignoredAdvisoryIds?: string[];

  // Whitelisted secret detector types (e.g. ['Slack Webhook'])
  ignoredSecretRules?: string[];
}
```

- **Incomplete Scan Safety**: When `allowIncompleteScans` is `false`, runs with unresolved scanner errors or uncheckable dependencies cannot be falsely marked clean.

---

## 7. Scanner Hardening & Privacy (Contribution 79)

- **Execution Timeouts**: Scans run with an abortable controller and configurable timeout (default: 8000ms). If a timeout occurs, the scan terminates safely and records a timeout error without throwing uncaught exceptions.
- **Resource Bounds**: Scans enforce a maximum dependency limit (default: 2000 dependencies) and maximum file count (default: 1000 files) to prevent resource exhaustion attacks.
- **Explicit External Consent**: Package metadata is **never** transmitted over the network to external APIs (e.g. `api.osv.dev`) unless `consentExternalNetworkLookup: true` is explicitly granted by the user or pipeline configuration.
- **Scratch Directory Isolation**: Temporary artifacts are placed in a dedicated scratch directory and cleaned up in a `finally` block upon completion.

---

## 8. Coverage & Known Limitations (Contribution 80)

### What Is Covered
- Static manifest and lockfile parsing for npm and PyPI ecosystems.
- Known vulnerabilities published in OSV and GitHub Advisory databases for pinned dependency versions.
- High-confidence regex pattern detection for 7+ common secret token formats.
- Complete data redaction in memory and on disk.

### Limitations & Out of Scope
- **Zero-Day Vulnerabilities**: Uncatalogued or unpublished vulnerabilities cannot be detected.
- **Dynamic Dependency Resolution**: Dependencies resolved dynamically at runtime (e.g., `eval("require('x')")` or dynamic `import()`) are not present in static manifests and cannot be cataloged.
- **Custom Obfuscated Secrets**: Highly obfuscated, encrypted, or split credentials (e.g. string concatenation across variables) are not detectable by regex patterns.
- **Binary Firmware / Compiled Code**: Native shared objects (`.so`, `.dll`, `.node`) are treated as binary files and excluded from secret text inspection.

---

## Verification & Testing

Run the master security CI regression test suite:

```bash
npm run test:security
```

Or run individual module test suites:
- `node tests/ecosystem-detection.test.mjs`
- `node tests/dependency-inventory.test.mjs`
- `node tests/vulnerability-scanner.test.mjs`
- `node tests/vulnerability-normalizer.test.mjs`
- `node tests/security-report.test.mjs`
- `node tests/secret-scanner.test.mjs`
- `node tests/secret-redaction.test.mjs`
- `node tests/security-gate.test.mjs`
- `node tests/scanner-hardening.test.mjs`
