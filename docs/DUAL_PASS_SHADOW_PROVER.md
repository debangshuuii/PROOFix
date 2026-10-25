# Dual-Pass Shadow Prover Architecture

The **Dual-Pass Shadow Prover** implements self-verifying AI patches with mathematical zero-regression guarantees.

## The Problem
AI coding assistants propose patches based on probabilistic text generation. Without execution evidence, patches frequently:
1. Fail to actually resolve the target bug.
2. Introduce unexpected secondary regressions on other routes.

## The Dual-Pass Verification Architecture

```
[ PASS 1: Baseline Failure ]
       │
       ▼ (Intercepts 404, React Hydration, or HTTP 500)
[ AI Evidence Diagnoser ]
       │
       ▼ (Generates AST Patch Diff)
[ Ephemeral Shadow Worktree ]
       │
       ▼ (Applies Patch Atomically with Rollback Guard)
[ PASS 2: Shadow Verification ]
       ├── 1. Target Check: Verifies Defect EXTINGUISHED
       └── 2. Regression Suite: Verifies 100% Pass Rate on Existing Checks
       │
       ▼
[ SHA-256 Cryptographic Proof Certificate Issued ]
```

## CLI Verification
```bash
# Execute shadow proof against e-commerce checkout scenario
npx proofix prove --scenario ecommerce_checkout

# Output machine-readable proof certificate
npx proofix prove --scenario ecommerce_checkout --json
```
