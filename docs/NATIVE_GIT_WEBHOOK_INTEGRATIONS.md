# 🐙 Native Git App & Webhook Ingestion Engine

## Architectural Overview
PROOFix natively ingests inbound webhooks from **GitHub Apps** and **GitLab Webhooks** to orchestrate automated end-to-end verification, strict status gating, and 1-click self-healing directly in Pull Request reviews.

```
 [GitHub / GitLab] 
        │ 
        │ (POST /api/v1/integrations/{provider}/webhook)
        ▼
 [HMAC-SHA256 Verifier] (Constant-time timingSafeEqual)
        │
        ▼
 [Provider Event Parser] (GitHubParser / GitLabParser -> NormalizedGitEvent)
        │
        ▼
 [CI Gating Coordinator] ────► [Distributed Queue & Sandbox Engine]
        │                                    │
        │                                    ▼
        │                         [Playwright Verification]
        │                                    │
        ▼                                    ▼
 [GitHub Check Run Output] ◄─── [CheckRunFormatter & Diagnostics]
 [PR Review Comment Patch] ◄─── [PrCommentSynthesizer] (1-Click Heal)
```

## Features Implemented (Contributions 191–200)

1. **Normalized Schemas & Type System (`src/lib/types/git-integrations.ts`)**:
   - `NormalizedGitEvent`, `CheckRunPayload`, `PrReviewComment`, and `GitIntegrationConfig`.

2. **Cryptographic Webhook Verification (`src/lib/integrations/webhook-verifier.ts`)**:
   - Constant-time `crypto.timingSafeEqual` evaluation for GitHub `X-Hub-Signature-256` and GitLab `X-Gitlab-Token`.
   - Prevents timing side-channel attacks.

3. **GitHub Event Parser & Normalizer (`src/lib/integrations/github-parser.ts`)**:
   - Normalizes `pull_request.opened`, `synchronize`, `reopened`, `push`, and `check_run.rerequested`.

4. **GitLab Webhook Parser & Normalizer (`src/lib/integrations/gitlab-parser.ts`)**:
   - Normalizes GitLab `Merge Request Hook` and `Push Hook` payloads.

5. **GitHub Check Run Formatter (`src/lib/integrations/check-run-formatter.ts`)**:
   - Rich Markdown check run summaries with test metrics, SLO thresholds, Largest Contentful Paint (LCP), Cumulative Layout Shift (CLS), and peak memory usage.
   - Embeds Playwright failure screenshots and unified diff snippets.

6. **PR Self-Healing Review Comment Synthesizer (`src/lib/integrations/pr-comment-synthesizer.ts`)**:
   - Synthesizes intelligent review comments with root cause analysis, selector migrations, and interactive `[⚡ 1-Click Apply Self-Healing Patch]` triggers.

7. **Inbound Webhook HTTP Endpoints (`src/app/api/v1/integrations/*`)**:
   - `/api/v1/integrations/github/webhook/route.ts`
   - `/api/v1/integrations/gitlab/webhook/route.ts`

8. **CI Merge Gating Coordinator (`src/lib/integrations/ci-gating-coordinator.ts`)**:
   - Manages check run lifecycle (`queued` -> `in_progress` -> `completed`).
   - Enforces merge gating status checks (`passed` vs `blocked`).

9. **Git Integrations Telemetry Dashboard UI (`src/components/integrations/GitIntegrationDashboard.tsx`)**:
   - Live stream of check run executions, status badges, diff inspection, and interactive event simulation.
   - Route: `/integrations/git`.

10. **Automated CI Test Suite**:
    - `npm run test:git` (`tests/verify-git-integrations-ci.mjs`).
