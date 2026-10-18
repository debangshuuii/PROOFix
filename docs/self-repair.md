# PROOFix AI Self-Repair Engine

The **PROOFix Self-Repair Engine** provides an automated, evidence-grounded workflow to diagnose test failures, formulate unified diff patches, safely apply and verify fixes in disposable workspaces, and publish authorized pull requests.

---

## Architecture & Lifecycle

```
[ Test Failure ]
       │
       ▼
1. Failure-Context Collector
   ├── Extracts Stack Trace, Console Errors, Network Drops
   ├── Fetches Local Source Snippets
   └── Sanitizes & Redacts All Secrets (API Keys, Bearer Tokens)
       │
       ▼
2. Patch Generator & Schema Validation
   ├── Enforces Shell Command Guardrails (blocks rm, curl, sh)
   ├── Produces Standard Unified Diff (---, +++, @@)
   └── Validates Strict FixProposal Schema
       │
       ▼
3. Security & Integrity Validation
   ├── Path Traversal Defense (blocks .., absolute paths)
   ├── File Extension Allowlists (.ts, .tsx, .js, .css, etc.)
   └── Context Line Integrity (prevents stale patch application)
       │
       ▼
4. Interactive Developer Review
   ├── Inspect Diff Without Touching Repository Files
   └── Explicit "Approve" or "Reject" Decision
       │
       ▼
5. Isolated Disposable Workspace
   ├── Deep-copies Target Commit into data/workspaces/disposable_*
   └── Applies Validated Patch Atomically with Rollback Safety
       │
       ▼
6. Patched Workspace Verification
   ├── Reruns Relevant Browser Tests
   └── Distinguishes: Verified Fix, Partial Improvement, or Regression
       │
       ▼
7. Authorized GitHub Branch & PR Creation
   ├── Requires Explicit Personal Access Token with Write Scope
   └── Publishes Dedicated Branch (proofix/fix-*) and Draft PR
```

---

## Security Model & Invariants

1. **Checkout Immutability**:
   Inspecting or rejecting a proposed patch **never** mutates the user's primary source directory or git working tree.
2. **Path Traversal Mitigation**:
   All paths inside the unified diff must normalize strictly inside the repository boundary. Any attempt to reference `../`, `/etc/`, or `C:\Windows` is caught and aborted before file access.
3. **Secret Redaction**:
   All error payloads, console traces, and network logs pass through the pattern redactor, stripping tokens like `sk-...`, `ghp_...`, `AIza...`, and database URIs before AI prompts are formulated.
4. **Shell Injection Prevention**:
   The patch generator strictly parses unified diff hunks. Prohibited patterns such as `rm -rf`, `curl | sh`, and `powershell` trigger an immediate safe error return.

---

## Running Self-Repair Tests Locally

```bash
# Run the full 10-stage verification suite
npx tsx tests/verify-repair-workflow.mjs
```
