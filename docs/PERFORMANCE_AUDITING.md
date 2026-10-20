# PROOFix Performance Auditing & Core Web Vitals (Contributions 91–93)

The **PROOFix Performance Auditing Engine** captures Google Core Web Vitals, profiles network waterfalls and resource budgets, tests under throttled network/CPU conditions, and detects regressions between project runs.

---

## Architecture & Contributions (91–93)

| Contri | Component / File | Description |
|:---:|:---|:---|
| **91** | `src/lib/performance/vitals-collector.ts` | Real-time Core Web Vitals (LCP, CLS, FCP, TTFB, INP) extraction via Chrome DevTools Protocol & PerformanceObserver with weighted scoring. |
| **92** | `src/lib/performance/resource-budget.ts`<br>`src/lib/performance/throttling.ts` | Resource categorization (JS, CSS, images, fonts), budget violation auditing, and CDP network/CPU throttling (`slow-3g`, `fast-3g`, `offline`). |
| **93** | `src/lib/performance/regression-detector.ts`<br>`src/components/performance/PerformanceAuditReport.tsx` | Regression analysis against baseline runs, performance gate policy enforcement, actionable recommendations, and visual scorecard UI. |

---

## 1. Google Core Web Vitals Standards

PROOFix evaluates metrics against standard Google thresholds:

| Metric | Name | Good (Green) | Needs Improvement (Yellow) | Poor (Red) |
|:---|:---|:---:|:---:|:---:|
| **LCP** | Largest Contentful Paint | ≤ 2.5 s | 2.5 s – 4.0 s | > 4.0 s |
| **CLS** | Cumulative Layout Shift | ≤ 0.10 | 0.10 – 0.25 | > 0.25 |
| **FCP** | First Contentful Paint | ≤ 1.8 s | 1.8 s – 3.0 s | > 3.0 s |
| **TTFB** | Time to First Byte | ≤ 0.8 s | 0.8 s – 1.8 s | > 1.8 s |
| **INP** | Interaction to Next Paint | ≤ 200 ms | 200 ms – 500 ms | > 500 ms |

### Weighted Performance Score (0–100)
- **LCP**: 30% weight
- **CLS**: 25% weight
- **FCP**: 15% weight
- **TTFB**: 15% weight
- **INP / FID**: 15% weight

---

## 2. Resource Budgets

Page loads are audited against configurable asset budgets to prevent bundle bloat:

```typescript
export const DEFAULT_RESOURCE_BUDGETS = {
  maxTotalSizeBytes: 2 * 1024 * 1024,   // 2 MB total transfer size
  maxJsSizeBytes: 500 * 1024,           // 500 KB JS bundle budget
  maxCssSizeBytes: 150 * 1024,          // 150 KB CSS budget
  maxImageSizeBytes: 1024 * 1024,       // 1 MB Image budget
  maxTotalRequests: 60,                 // 60 HTTP requests
  maxDomNodes: 1500,                    // 1,500 DOM elements
  maxDomDepth: 32,                      // 32 levels of nesting
};
```

---

## 3. Network & CPU Throttling Profiles

PROOFix drives Chrome DevTools Protocol to simulate mobile connectivity:

- **`slow-3g`**: 500 Kbps download / 500 Kbps upload, 400ms RTT latency, 4x CPU slowdown.
- **`fast-3g`**: 1.6 Mbps download / 750 Kbps upload, 150ms RTT latency.
- **`offline`**: Simulates complete network loss to test PWA and error boundary handling.
- **`none`**: Full unthrottled local connection.

State tracking guarantees that throttling is reset after every run without leaking across runs.

---

## 4. Performance Regression Gates

Regressions are evaluated against baseline runs. A run fails the performance gate if:
1. Any Core Web Vital receives a **`poor`** rating.
2. The overall performance score drops below **65**.
3. LCP regresses by more than **20%** compared to baseline.
4. Total transfer size increases by more than **15%**.

---

## 5. Verification & CI Testing

Run the master CI regression suite:

```bash
npm run test:performance
```
