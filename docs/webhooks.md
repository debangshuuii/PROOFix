# GitHub Webhook Integration

PROOFix includes an automated GitHub webhook receiver that triggers verification runs on `push` and `pull_request` events, validating changes in an isolated sandbox before production deployments.

---

## Webhook Endpoint

`POST /api/v1/webhooks/github`

---

## Configuration Steps in GitHub

1. Navigate to your repository on GitHub: **Settings** > **Webhooks** > **Add webhook**.
2. **Payload URL**: `https://your-domain.com/api/v1/webhooks/github`
3. **Content type**: `application/json`
4. **Secret**: Enter a secret token and set `GITHUB_WEBHOOK_SECRET` in your PROOFix `.env.local`:
   ```bash
   GITHUB_WEBHOOK_SECRET=your_super_secret_webhook_token
   ```
5. **Which events would you like to trigger this webhook?**:
   - Select **Let me select individual events**:
     - [x] **Pushes**
     - [x] **Pull requests**
6. Click **Add webhook**.

---

## Security & Signature Validation

Every incoming request is verified using HMAC SHA-256 (`x-hub-signature-256`). Timing-safe comparison prevents timing attacks.

---

## Status Badges

Add a dynamic verification badge to your `README.md` to showcase verification pass rates:

```markdown
[![PROOFix Verification](http://your-domain.com/api/v1/projects/:id/badge)](http://your-domain.com/projects/:id)
```
