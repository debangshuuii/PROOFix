# Feature 2 — Interactive Visual Regression Slider (Contributions 11–20)

## Overview

The PROOFix **Interactive Visual Regression Slider** provides developers with pixel-level inspection tools to evaluate UI changes across verification runs. Rather than comparing unanchored raw images, PROOFix indexes screenshots by route, viewport, browser engine, and test context, matching them into compatible pairs and computing precise pixel variance.

---

## Architecture & Modular Contributions

### 11. Screenshot Metadata Schema & Artifact Indexer
- **Schema (`src/lib/types/visual-regression.ts`)**: Encapsulates `id`, `runId`, `projectId`, `route`, `viewport` (`width`, `height`, `isMobile`), `browser`, `timestamp`, `testContext` (`testName`, `category`, `selector`, `tags`), `filePath`, and `format`.
- **Indexer (`src/lib/comparison/screenshot-indexer.ts`)**: Indexes existing artifacts across verification runs, provides schema validation, and enables fast querying by compatible route, browser, and viewport.
- **API**: `GET /api/v1/projects/[id]/screenshots` & `POST /api/v1/projects/[id]/screenshots`.

### 12. Dynamic Baseline Selection & Run History Management
- **Service (`src/lib/comparison/baseline-manager.ts`)**: Allows completed runs to serve as the project baseline without modifying application source code.
- **Validation**: Rejects incomplete or failed runs (`status !== 'completed'`).
- **History Tracking**: Automatically marks previous baselines as superseded and records full transition history.
- **API**: `GET /api/v1/projects/[id]/baseline` & `POST /api/v1/projects/[id]/baseline`.

### 13. Compatible Screenshot Pair Matcher
- **Engine (`src/lib/comparison/pair-matcher.ts`)**: Matches screenshot checkpoints by route, viewport dimensions, browser engine, and test category.
- **Diagnostic Statuses**:
  - `matched`: Fully compatible pairing.
  - `unmatched_missing_target`: Baseline has a checkpoint missing in target run.
  - `unmatched_missing_baseline`: Target run introduced a new checkpoint without prior baseline.
  - `incompatible_viewport`: Viewport dimensions mismatch.
  - `incompatible_browser`: Browser rendering engines differ.
  - `incompatible_route`: Route paths mismatch.
- **API**: `GET /api/v1/projects/[id]/compare/pairs`.

### 14. Pixel Difference Generation Engine
- **Engine (`src/lib/comparison/diff-engine.ts`)**: Employs `pixelmatch` and `pngjs` to perform pixel-by-pixel comparisons with configurable tolerance thresholds (`threshold: 0.05` to `0.5`).
- **Controlled Fixtures**: Generates synthetic PNG fixtures producing predictable delta outputs (e.g., 20x25 px modification = exactly 500 changed pixels).
- **Artifacts**: Writes pixel diff PNG images with highlighted color overlays to `/artifacts/diffs/`.
- **API**: `POST /api/v1/projects/[id]/compare/diff`.

### 15. Draggable Before/After Slider
- **Component (`src/components/visual/VisualDiffSlider.tsx`)**:
  - Touch and mouse event listeners (`onMouseDown`, `onTouchStart`, `onTouchMove`).
  - Clamping between 0% and 100% position.
  - Keyboard accessible (Left/Right arrows in 2% steps, Home/End for full before/after).
  - Floating badges for Baseline (Before) and Current Run (After).

### 16. Multi-Mode Inspection (Slider, Side-by-Side, Overlay)
- **Component (`src/components/visual/ComparisonModeViewer.tsx`)**:
  - **Slider**: Draggable split divider.
  - **Side-by-Side**: Concurrently visible viewports with synchronized layout.
  - **Onion Skin Overlay**: Opacity range slider (0% to 100%) with CSS blend mode selection (`normal`, `difference`, `exclusion`).
  - **Invariant Guarantee**: All three modes inspect the identical matched screenshot pair.

### 17. Synchronized Zoom & Pan Controls
- **Hook & Math (`src/components/visual/useZoomPan.ts`)**:
  - Zoom levels: 1.0x to 5.0x with preset buttons (1.0x, 1.5x, 2.0x, 3.0x).
  - Drag to pan when zoomed (> 1.0x).
  - Boundary clamping preventing viewport overflow.
  - Shared coordinate transform `scale(...) translate(...)` ensuring lockstep alignment.
- **Component (`src/components/visual/ZoomPanToolbar.tsx`)**.

### 18. Difference Statistics & Non-Bug Semantic Labeling
- **Service (`src/lib/comparison/diff-stats.ts`)**: Computes total pixels, changed pixels, variance percentage, and active threshold.
- **Mandatory Policy**: Labeled strictly as **Visual Differences**, not confirmed bugs:
  - `No Visual Change (Visual Match)`
  - `Minor Visual Difference (Styling / Anti-aliasing)`
  - `Significant Visual Difference (Layout / Content Shift)`
- **Component (`src/components/visual/VisualDiffStatsCard.tsx`)**: Displays scorecard and developer disclaimer.

### 19. Dynamic Region Masking Engine
- **Engine (`src/lib/comparison/mask-manager.ts`)**: Allows volatile regions (timestamps, carousels, counters) to be excluded from pixel difference calculations and statistics.
- **Consistency**: Masked pixels are neutralized in diff image and excluded from changed pixel counters.
- **Component (`src/components/visual/DynamicRegionMaskEditor.tsx`)**: Provides one-click presets for header clocks, rotating banners, and counter boxes.
- **API**: `GET`, `POST`, `DELETE /api/v1/projects/[id]/masks`.

### 20. Baseline Approval, Audit Trail & CI Testing
- **Approval Engine (`src/lib/comparison/baseline-approval.ts`)**:
  - Records approver name, email, timestamp, comment, and SHA-256 cryptographic audit signature.
  - Full audit trail history retrieval.
- **CI Test Suite (`tests/verify-visual-regression-ci.mjs`)**: End-to-end verification covering Contributions 11 through 20.
- **API**: `POST /api/v1/projects/[id]/baseline/approve` & `GET /api/v1/projects/[id]/baseline/audit-trail`.

---

## Running CI Tests

```bash
# Run Visual Regression CI Suite
npm run test:visual

# Run Full Repair & Verification Suite
npm run test:repair
npm test
```
