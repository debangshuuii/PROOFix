# 🐒 Autonomous Exploratory "Chaos Monkey" AI Crawler

## Architectural Overview
The PROOFix Chaos Monkey Crawler is an autonomous exploratory agent that systematically explores arbitrary links, clicks menus, inputs random edge-case payloads, and detects zero-day uncaught exceptions (`window.onerror`), responsive layout shifts/overflows, and HTTP 500 server crashes without requiring predefined test scripts.

```
                  ┌──────────────────────────────────────────────┐
                  │       Autonomous Chaos Monkey Crawler        │
                  └──────────────────────┬───────────────────────┘
                                         │
             ┌───────────────────────────┼───────────────────────────┐
             ▼                           ▼                           ▼
  ┌───────────────────────┐   ┌───────────────────────┐   ┌───────────────────────┐
  │ DomElementDiscoverer  │   │ VisionHeuristicPlanner│   │ AdversarialPayloadGen │
  │ (Buttons/Links/Forms) │   │ (Action Optimization) │   │ (XSS/SQLi/RTLO/Emoji) │
  └──────────┬────────────┘   └──────────┬────────────┘   └──────────┬────────────┘
             │                           │                           │
             └───────────────────────────┼───────────────────────────┘
                                         │
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │            Playwright Execution              │
                  └──────────────────────┬───────────────────────┘
                                         │
             ┌───────────────────────────┴───────────────────────────┐
             ▼                                                       ▼
  ┌──────────────────────────────────────┐        ┌──────────────────────────────────────┐
  │         StateGraphTraverser          │        │           AnomalySentinel            │
  │ G=(V,E) State Hashes & Cycle Traps   │        │ (window.onerror, HTTP 500s, Layout)  │
  └──────────────────────────────────────┘        └──────────────────────────────────────┘
```

## Features Implemented (Contributions 221–230)

1. **State Graph & Crawler Types (`src/lib/types/chaos-crawler.ts`)**:
   - `CrawlerAction`, `CrawlerAnomaly`, `StateGraphNode`, `StateGraphEdge`, `ChaosCrawlerConfig`.

2. **Adversarial Edge-Case Payload Generator (`src/lib/crawler/adversarial-payloads.ts`)**:
   - 6 attack vectors: XSS breakout probes, SQL injection tautologies, RTL override (\u202E), zalgo diacritics, zero-width characters, 4-byte astral emojis, and prototype pollution probes (`__proto__`).

3. **DOM Element Discoverer & Priority Scorer (`src/lib/crawler/dom-element-discoverer.ts`)**:
   - Parses clickable elements, prioritizes unvisited routes and fuzzed inputs while downranking destructive actions.

4. **Directed State Graph & Cycle Detection (`src/lib/crawler/state-graph-traverser.ts`)**:
   - Deterministic SHA-256 state hashes, loop prevention, and BFS shortest-path anomaly reproduction.

5. **Real-Time Anomaly Sentinel (`src/lib/crawler/anomaly-sentinel.ts`)**:
   - Traps `window.onerror`, `onunhandledrejection`, HTTP 500/502/504 errors, and horizontal layout overflows (`scrollWidth > innerWidth`).

6. **Vision-Guided Heuristic Exploration Planner (`src/lib/crawler/vision-heuristic-planner.ts`)**:
   - Synthesizes dynamic exploratory steps based on state novelty and DOM hierarchy.

7. **Master Crawler Controller (`src/lib/crawler/chaos-monkey-crawler.ts`)**:
   - Orchestrates exploratory sessions and generates comprehensive anomaly diagnostics.

8. **Chaos Crawler REST API Route (`src/app/api/v1/crawler/chaos/route.ts`)**:
   - Endpoint to trigger autonomous crawls and stream status.

9. **Chaos Monkey Visualizer UI (`src/components/crawler/ChaosMonkeyVisualizer.tsx`)**:
   - Interactive UI state graph, anomaly feed, and live sweep trigger at `/crawler`.

10. **Automated CI Suite**:
    - `npm run test:crawler` (`tests/verify-chaos-crawler-ci.mjs`).
