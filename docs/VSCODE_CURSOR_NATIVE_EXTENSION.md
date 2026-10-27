# 💻 VS Code & Cursor Native IDE Extension

> **"Never switch windows to check if your code works. Prove routes directly from your editor gutter."**

The **PROOFix VS Code & Cursor Native Extension** brings evidence-grounded Playwright Chromium verification, real-time gutter status lenses, one-click CodeLens actions, and inline self-healing patch reviews directly into your daily editing environment.

---

## 🌟 Key Capabilities

### 1. Route Gutter Badges & Status Lens
Directly beside the export line of Next.js route handlers (`app/**/page.tsx` and `app/api/**/route.ts`):
- 🛡️ **Green Shield:** Route proven with 100% genuine Playwright evidence (0 regressions).
- 🚨 **Red Cross:** Route failed verification checks.
- ⏳ **Blue Shield:** Dual-Pass Shadow Prover actively proving the route in an isolated sandbox.

Hovering over any gutter badge reveals the **Status Lens**:
```markdown
### 🛡️ PROOFix Route Status: PROVEN
Target Route: `/checkout`
Pass Rate: 100% (3/3 journeys passing)
Execution Duration: 0.8s
Last Verified: 10:45:12 PM
Cryptographic Proof: 4f53cda18c2baa0c...
```

### 2. Inline CodeLens Actions
Directly above your route components and API handlers:
- `▶ Run Journey (/checkout)`: Triggers genuine Playwright test pass for this route.
- `🛡️ Prove Route`: Dispatches the Dual-Pass Shadow Prover.
- `🚨 1 Failing Defect (Inspect Failure Evidence)`: Jumps straight to the diagnostic diff viewer.

### 3. VS Code Test Explorer Integration
Seamlessly mounts into the native VS Code Test Activity Bar:
```
▼ PROOFix Verification Workspace
  ▼ Page Routes
    ▼ /checkout (CheckoutPage)
      • Smoke & HTTP Health Check
      • Interactive DOM & Hydration Check
  ▼ API Routes
    ▼ /api/v1/health (GET)
      • Smoke & HTTP Health Check
```
- Real-time step progress reporting.
- Native error messages with expected vs. actual assertion diffs.

### 4. Inline Patch Application & Side-by-Side Diff Viewer
When PROOFix formulates an AI self-healing proposal:
- Click **"Inspect Failure Diff"** to launch native `vscode.diff` side-by-side comparison.
- Click **"Apply Proven Fix"**: atomically applies the patch and creates a local `.proofix.bak` backup.
- Click **"Rollback Fix"**: instantly restores the original code if needed.

---

## ⚙️ Configuration Settings

Open VS Code Settings (`Cmd+,` or `Ctrl+,`) and search for `proofix`:

| Setting | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `proofix.serverUrl` | `string` | `http://localhost:3000` | URL of the local PROOFix daemon |
| `proofix.showGutterBadges` | `boolean` | `true` | Display status icons in editor gutter |
| `proofix.enableCodeLens` | `boolean` | `true` | Show inline CodeLens above route exports |
| `proofix.autoProveOnSave` | `boolean` | `false` | Automatically run Shadow Prover on file save |
| `proofix.preferredAiProvider` | `enum` | `gemini` | `gemini`, `openai`, `anthropic`, or `offline` |
| `proofix.diffViewerMode` | `enum` | `split` | `split` or `unified` diff display mode |

---

## 🚀 Building & Packaging

```bash
# Build the extension bundle
cd extensions/vscode-proofix
npm install
npm run build

# Run automated extension verification suite
npm run test:vscode
```
