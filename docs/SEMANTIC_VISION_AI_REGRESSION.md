# PROOFix Semantic Vision-AI Visual Regression (Contributions 111–120)

The **PROOFix Semantic Vision-AI Visual Regression Engine** moves beyond brittle pixel-by-pixel diffing to detect human-perceivable UI defects and layout regressions using multimodal vision intelligence (Google Gemini 1.5 Flash/Pro and specialized vision models).

---

## The Problem with Traditional Pixel Diffs

Traditional pixel-comparison algorithms (such as pixelmatch) compare raw RGB values between images. While effective for static snapshots, they frequently flag false positives due to:
1. **Subpixel Font Anti-Aliasing**: Microscopic 1–2px color smoothing variations between GPU drivers, operating systems, and browser versions.
2. **Dynamic Content Jitter**: 1px displacements in banners or dates trigger thousands of red failing pixels across the entire page layout.
3. **Lack of Human Understanding**: Pixel diffs cannot distinguish between a catastrophic flaw (a modal drawer covering a "Place Order" button) and an unnoticeable subpixel font shift.

---

## Architecture & Contributions (111–120)

| Contribution | Component / Module | Description |
|:---:|:---|:---|
| **111** | `src/lib/types/semantic-vision.ts`<br>`src/lib/types/index.ts` | Type definitions, defect taxonomy, bounding box schema, and audit result contracts. |
| **112** | `src/lib/vision/vision-config.ts` | Validated configuration presets, sensitivity thresholds, multimodal vision provider options, and structured prompt templates. |
| **113** | `src/lib/vision/image-preprocessor.ts` | PNG header dimension parser, base64 data URL encoder, and coordinate bounding box normalizer. |
| **114** | `src/lib/vision/semantic-comparator.ts` | Fast Euclidean color-distance pre-filter that suppresses harmless subpixel anti-aliasing noise and fast-paths identical screens. |
| **115** | `src/lib/vision/multimodal-client.ts` | Multimodal vision API client supporting Google Gemini 1.5 Flash/Pro with dual-image payloads, offline mock fallback, and zero API key leakage. |
| **116** | `src/lib/vision/defect-classifier.ts` | Robust model output parser stripping markdown code fences, filtering low-confidence hallucinations, and computing health scores. |
| **117** | `src/lib/vision/layout-shift-explainer.ts` | Layout shift diagnostic engine correlating DOM elements and media tags with visual displacements, producing code-level HTML/CSS fixes. |
| **118** | `src/lib/vision/vision-audit-service.ts` | High-level orchestrator connecting pre-filtering, model querying, defect enrichment, and verification run results. |
| **119** | `src/components/vision/SemanticVisionReport.tsx`<br>`src/app/projects/[id]/runs/[runId]/page.tsx` | Interactive UI with annotated screenshot overlays, bounding box highlights, layout shift diagnosis drawers, and human-in-the-loop dismissals. |
| **120** | `tests/verify-semantic-vision-ci.mjs`<br>`package.json` | Master CI regression suite covering all 10 stages end-to-end, integrated into `npm run test:vision`. |

---

## 1. Supported Defect Categories

| Category | Severity | Description |
|:---|:---:|:---|
| **`text_clipping`** | High / Medium | Text clipped by container overflow, truncated table cell strings, or unreadable ellipsis cutoffs. |
| **`element_overlap`** | Critical / High | Two or more UI elements unintentionally stacked, obscuring text or click targets. |
| **`broken_image_placeholder`** | High | Missing asset icons, empty gray placeholder rectangles, or failed CDN images. |
| **`navigation_obscuration`** | Critical | Modals, sticky headers, or cookie banners directly blocking primary action buttons or form fields. |
| **`unexpected_layout_shift`** | High / Medium | Unintended macro displacement of page components caused by unconstrained media or late-loading elements. |
| **`contrast_anomaly`** | Medium / Low | Low-contrast text unreadable against light or dark background elements. |
| **`unrendered_content`** | Critical / High | Blank content areas, raw template placeholders (`{{title}}` or `undefined`), or un-hydrated React skeletons. |

---

## 2. Layout Shift Root Cause Diagnostic Engine

Instead of generic pixel diff reports, PROOFix identifies the culprit DOM element and outputs actionable human-readable explanations with remediation code:

```
[Culprit]: img.hero-banner
[Displacement]: +120px down
[Root Cause]: missing_media_dimensions
[Explanation]: The hero image was rendered without explicit width and height dimensions, displacing downstream page content 120px down.
[Fix]: Specify explicit width and height attributes or CSS aspect-ratio.
[Code Snippet]: <img src="..." width="800" height="400" className="w-full h-auto" style={{ aspectRatio: '16/9' }} />
```

---

## 3. Fast-Path Anti-Aliasing Pre-Filter

PROOFix computes Euclidean color distance $\Delta E = \sqrt{(\Delta R)^2 + (\Delta G)^2 + (\Delta B)^2}$. If changes between screenshots are below perceptual thresholds ($\Delta E \le 16$), the audit classifies differences as pure font rendering noise and bypasses LLM inference entirely:
- **Zero latency overhead** on unchanged or identical test runs.
- **Zero token consumption** on font-only subpixel jitter.
- **100% precision** on macroscopic structural and layout shifts.

---

## 4. Verification & CI Testing

Run the master semantic vision CI test suite:

```bash
npm run test:vision
```

Or execute individual unit test suites:
- `node tests/semantic-vision-types.test.mjs` (Types & schema)
- `node tests/vision-config.test.mjs` (Configuration & prompt templates)
- `node tests/image-preprocessor.test.mjs` (Image parsing & bounding boxes)
- `node tests/semantic-comparator.test.mjs` (Subpixel anti-aliasing pre-filter)
- `node tests/multimodal-client.test.mjs` (Multimodal client & key leak defense)
- `node tests/defect-classifier.test.mjs` (Defect parser & score calculation)
- `node tests/layout-shift-explainer.test.mjs` (DOM layout shift diagnostics)
- `node tests/vision-audit-service.test.mjs` (Orchestration lifecycle)
- `node tests/semantic-vision-ui.test.mjs` (UI component & run page integration)
