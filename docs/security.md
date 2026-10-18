# PROOFix Security & Threat Model

## 1. Security Philosophy

PROOFix treats untrusted code, repository contents, README instructions, package manifests, and AI suggestions with zero implicit trust:

1. **Untrusted Code Execution**: Repository dependencies and scripts are isolated from host application secrets.
2. **Path Traversal & Zip Slip Defense**: Uploaded archives are inspected entry-by-entry. Entries containing `..` or absolute paths are rejected immediately. Uncompressed size is capped at 150MB to neutralize zip-bomb attacks.
3. **Secret Redaction**: Environment variables are scanned for names only. Secret values are never exposed in user interfaces, logs, or AI prompt contexts.
4. **Safe Testing Policy**: Destructive user actions—payments, account deletion, irreversible database mutations, or unauthenticated outbound webhooks—are blocked by default unless explicitly white-listed in an authorized test plan.
5. **No Blind Execution**: AI-generated shell commands are never executed directly without bounded validation.

---

## 2. Sandbox Execution Policies

| Control | Implementation |
| :--- | :--- |
| **Execution User** | Unprivileged host/container user. |
| **Port Allocation** | Dedicated dynamic port allocation per verification run. |
| **Timeout Enforcement** | Hard kill after configurable timeout (default 45s). |
| **Process Cleanup** | Forceful child process tree termination on completion or cancellation. |
| **Secrets Sanitation** | Sensitive host environment variables stripped before spawning child processes. |

---

## 3. Threat Model & Known Limitations

- **Local Sandbox Mode**: When running without Docker daemon, isolation relies on OS process boundaries. Host file system access is restricted by file permissions.
- **Container Isolation Mode**: In production container deployments, Docker/cgroups enforces memory quotas, CPU throttling, and virtual network barriers.
