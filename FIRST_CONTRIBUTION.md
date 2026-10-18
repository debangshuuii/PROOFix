# Your First Contribution to PROOFix 🎉

Thank you for your interest in contributing to **PROOFix**! Whether you are a student, an indie developer, an open-source newcomer, or a veteran engineer, we want your experience to be smooth and rewarding.

---

## 🌟 Where to Begin?

1. **Browse Good First Issues**:
   - Look for issues labeled [`good first issue`](https://github.com/debangshuuii/PROOFix/labels/good%20first%20issue) or [`documentation`](https://github.com/debangshuuii/PROOFix/labels/documentation).
2. **Review Code Architecture**:
   - Read [`docs/architecture.md`](file:///d:/Coding/PROOFix/docs/architecture.md) and [`docs/api.md`](file:///d:/Coding/PROOFix/docs/api.md) to understand how the analyzer, sandbox runner, and AI diagnoser interact.

---

## 🚀 5-Minute Local Setup

### 1. Clone & Install
```bash
git clone https://github.com/debangshuuii/PROOFix.git
cd PROOFix
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env.local
```
*(No external API keys required! PROOFix includes an offline deterministic rule engine and pre-seeded test fixtures out of the box).*

### 3. Verify Your Setup
Run the built-in self-verification suite:
```bash
npm run typecheck
node tests/verify-proofix.mjs
```
Both should pass with **0 errors**.

### 4. Launch the Dev Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to see the dashboard in action.

---

## 🛠️ Step-by-Step Contribution Workflow

1. **Create a Feature Branch**:
   ```bash
   git checkout -b feat/my-improvement
   ```
2. **Make Small, Focused Changes**:
   - Write clear code following our TypeScript types in `src/lib/types/`.
   - Never commit sensitive API keys or unredacted tokens.
3. **Validate Your Changes**:
   ```bash
   npm run typecheck
   node tests/verify-proofix.mjs
   ```
4. **Commit with Conventional Commits**:
   - `feat(...)`: A new feature
   - `fix(...)`: A bug fix
   - `docs(...)`: Documentation changes
   - `test(...)`: Adding or updating tests
5. **Submit a Pull Request**:
   - Push your branch to GitHub and open a PR.
   - Fill out our PR template checklist.

---

## Need Help?
Ask questions by opening a GitHub Discussion or filing an issue with the `question` label. We are excited to see what you build!
