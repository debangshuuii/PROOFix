# Slack & Discord Webhook Alerts (Feature 9)

## Overview

PROOFix includes a resilient, security-hardened notification engine that automatically notifies developers when verification runs finish, fail, or detect significant behavioral regressions or security findings.

Notifications support **Slack Incoming Webhooks** and **Discord Webhooks**, operating completely decoupled from the primary verification execution path to ensure that webhook network failures, provider rate limits, or transient outages never alter or delay verification run results.

---

## Architecture & Contributions (81–90)

| Contribution | Module | Key Responsibility |
|---|---|---|
| **81** | `schema.ts` / `types/notification.ts` | Defines notification event schema, channel configs, delivery preferences, and unsolicited delivery guards (`enabled: false` by default). |
| **82** | `WebhookConfigModal.tsx` / API | Secure UI and REST endpoints (`/api/v1/projects/[id]/notifications`) protected by project ownership authorization checks. |
| **83** | `secret-vault.ts` | Authenticated AES-256-GCM encryption for webhook secrets at rest, URL masking, and automatic log redaction. |
| **84** | `slack-adapter.ts` | Formats normalized events into Slack Block Kit messages containing project identity, status, short commit, and report link without raw source code or secrets. |
| **85** | `discord-adapter.ts` | Formats normalized events into Discord embeds, enforces Discord payload character limits, and handles API response codes (204, 429, 400, 404, 5xx). |
| **86** | `test-sender.ts` / API | Test notification endpoint (`/api/v1/projects/[id]/notifications/test`) with clear test labeling (`[TEST]`) and URL concealment. |
| **87** | `delivery-engine.ts` | Non-blocking background delivery with bounded retries (3 max), exponential backoff with jitter, 5s timeout, and strict verification run status isolation. |
| **88** | `deduplication.ts` | Idempotent event deduplication tracking that prevents duplicate notifications when CI jobs are retried within the sliding deduplication window. |
| **89** | `ssrf-guard.ts` | Server-Side Request Forgery (SSRF) hardening that blocks private IPs, loopback, cloud metadata (169.254.169.254), non-HTTPS schemes, and automatic HTTP redirects. |
| **90** | `verify-notifications-ci.mjs` | Master CI regression suite validating all 10 contributions using synthetic fixtures and zero-secret-leakage assertions. |

---

## Supported Notification Events

The preflight notification engine supports five core event types:

1. **`run.completed`**: Triggered when a verification run succeeds cleanly with zero failures.
2. **`run.failed`**: Triggered when browser assertions, build processes, or HTTP health checks fail.
3. **`regression.detected`**: Triggered when visual layout shifts, broken routes, or unexpected behavior regressions are identified compared to the baseline commit.
4. **`security.alert`**: Triggered when known CVE vulnerabilities or accidentally committed credentials are detected during preflight.
5. **`run.started`**: Optional alert sent when a long-running verification pipeline commences.

---

## Security & Privacy Rules

### 1. Zero Credential Usage Rule
> [!IMPORTANT]
> **Finding a credential does not authorize PROOFix to use it.**
> If secrets or API tokens are detected in a repository during preflight, PROOFix reports the finding category, file location, and line number safely. It **never** attempts authentication with detected credentials, **never** includes raw credential values in notification payloads, and **never** claims a repository is vulnerability-free after a partial or failed scan.

### 2. Authenticated AES-256-GCM Secret Storage
- Webhook URLs contain sensitive platform tokens. PROOFix encrypts all webhook URLs at rest using **AES-256-GCM** with a random 96-bit initialization vector (IV) and a 128-bit authentication tag.
- Ordinary settings APIs return only a masked URL (e.g. `https://hooks.slack.com/services/••••••••12ab`) and `hasSecret: true`. Plaintext URLs are **never** returned to the browser.
- Tampered or corrupted secret payloads fail authenticated decryption integrity checks automatically.

### 3. Destination SSRF Hardening
All webhook URLs are validated prior to initiating outbound network connections:
- **Strict HTTPS Scheme**: `http:`, `file:`, `ftp:`, `javascript:`, and `data:` schemes are strictly blocked.
- **Private Network Blocking**: RFC 1918 private IPv4 (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), loopback (`127.0.0.0/8`, `::1`), and CGNAT (`100.64.0.0/10`) destinations are rejected.
- **Cloud Metadata Shield**: Link-local cloud metadata endpoints (`169.254.169.254`, `metadata.google.internal`) are blocked.
- **Standard Ports Only**: Non-standard ports (e.g., `:8080`, `:8443`) are rejected.
- **Redirect Controls**: Webhook requests set `redirect: 'error'` to eliminate open-redirect SSRF bypasses.

---

## Webhook Platform Setup Guides

### Slack Incoming Webhook Setup
1. In your Slack workspace, go to **Manage Apps** > **Custom Integrations** > **Incoming WebHooks** (or create a Slack App with Incoming Webhooks enabled).
2. Choose the channel to receive alerts (e.g., `#deploy-alerts`).
3. Copy the Webhook URL (format: `https://hooks.slack.com/services/T.../B.../...`).
4. In PROOFix, open your project > **Webhook Alerts** modal > Select **Slack** > Paste the URL.
5. Choose your triggering events (`run.failed`, `regression.detected`, etc.) and click **Save Settings**.
6. Click **Test** to dispatch a test notification to Slack.

### Discord Webhook Setup
1. In your Discord server, navigate to the target text channel > **Edit Channel** (gear icon) > **Integrations** > **Webhooks**.
2. Click **New Webhook**, assign a name (e.g. `PROOFix Alerts`), and copy the Webhook URL (format: `https://discord.com/api/webhooks/.../...`).
3. In PROOFix, select **Discord** > Paste the Webhook URL > Choose triggering events.
4. Click **Save Settings** and verify with **Test**.

---

## Delivery Resilience & Deduplication

### Verification Run Decoupling
Webhook deliveries run completely outside the verification execution pipeline:
- A network failure, HTTP 500 error from Slack/Discord, or rate-limit timeout **cannot** change the verification run's status (`completed`, `failed`).
- Deliveries enforce a strict 5000ms timeout per attempt to prevent hanging jobs indefinitely.

### Bounded Retries & Exponential Backoff
- Transient failures (HTTP 5xx server errors, HTTP 429 rate limits, socket timeouts) are retried up to **3 attempts**.
- Retries utilize exponential backoff with randomized jitter (`base * 2^(attempt-1) + jitter`) to prevent thundering herd spikes.
- Non-retryable errors (HTTP 400 Bad Request, HTTP 404 Webhook Not Found) are stopped immediately on attempt 1.

### Idempotent Deduplication
- When CI pipelines automatically retry a flaky build or restart a verification job for the same commit and run ID, PROOFix generates an idempotent deduplication key:
  $$\text{Key} = \text{SHA256}(\text{projectId} + \text{runId} + \text{eventType} + \text{commitHash} + \text{channelId})$$
- If the event was already delivered to that channel within the sliding deduplication window (1 hour), the subsequent delivery is skipped cleanly, preventing duplicate notifications.
- Developer test notifications (`isTest: true`) explicitly bypass deduplication so developers can test webhook configurations repeatedly.

---

## Troubleshooting & Status Codes

| Status / Error | Cause | Resolution |
|---|---|---|
| **`400 Bad Request`** | Invalid webhook payload or unsupported Discord embed format. | Non-retryable error. PROOFix clamps all Discord embeds to 1000 characters and Slack blocks to safe character limits. |
| **`404 Not Found`** | Webhook URL was revoked or channel was deleted in Slack/Discord. | Non-retryable error. Generate a new webhook URL in Slack/Discord and update project settings. |
| **`429 Rate Limited`** | Too many notifications sent in a short window. | Automatically retried using Discord's `retry_after` header or exponential backoff. |
| **`5xx Server Error`** | Temporary Slack or Discord API outage. | Automatically retried up to 3 times before recording failure in delivery log. |
| **`Blocked by SSRF policy`** | Webhook URL targets an internal IP, non-HTTPS scheme, or unauthorized host. | Ensure webhook URL uses `https://hooks.slack.com` or `https://discord.com`. |

---

## Automated Verification & Regression Testing

Run the master webhook notifications test suite in CI:

```bash
npm run test:notifications
```

Or run individual module test suites:
- `node tests/notification-schema.test.mjs`
- `node tests/webhook-config-auth.test.mjs`
- `node tests/webhook-secret-vault.test.mjs`
- `node tests/slack-adapter.test.mjs`
- `node tests/discord-adapter.test.mjs`
- `node tests/notification-test-flow.test.mjs`
- `node tests/notification-delivery.test.mjs`
- `node tests/notification-deduplication.test.mjs`
- `node tests/ssrf-guard.test.mjs`
