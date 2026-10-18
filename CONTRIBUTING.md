# Contributing to PROOFix

Thank you for your interest in contributing to **PROOFix**! PROOFix is an open-source, AI-powered application verification and browser testing platform designed to help developers prove that their generated applications work before deploying them.

## 🧭 Code of Conduct

This project adheres to the [Contributor Covenant](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to `maintainers@proofix.dev`.

---

## 🛠️ Development Setup

### Prerequisites
- **Node.js**: v20 or higher
- **npm**: v10 or higher
- **Playwright Chromium**: installed via `npx playwright install chromium`

### Getting Started

1. **Fork and Clone the Repository**:
   ```bash
   git clone https://github.com/<your-username>/PROOFix.git
   cd PROOFix
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   npx playwright install chromium
   ```

3. **Set Up Environment Variables**:
   ```bash
   cp .env.example .env.local
   ```

4. **Start the Local Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` to inspect the UI and API.

---

## 🧪 Testing Guidelines

Before opening a pull request, ensure all tests pass:

```bash
# Run self-verification automated test suite
npm test

# Run TypeScript type check
npm run typecheck

# Run production build validation
npm run build
```

---

## 🌿 Git & Branching Conventions

- Use descriptive branch names:
  - `feature/add-playwright-axe-audit`
  - `fix/archive-zip-slip-validation`
  - `docs/update-api-reference`
- Write clear commit messages following Conventional Commits:
  - `feat: add live execution progress streaming via SSE`
  - `fix: resolve port conflict during sandbox initialization`
  - `docs: add comprehensive contributor guide`
  - `test: add automated fixture verification check`

---

## 🚀 Submitting a Pull Request (PR)

1. Ensure all code changes are thoroughly tested and adhere to strict TypeScript typing.
2. Ensure you have not introduced unredacted secrets or hardcoded credentials.
3. Link the relevant issue in the PR description (e.g., `Fixes #42`).
4. Keep PRs focused on a single concern to make review seamless.
