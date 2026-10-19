# PROOFix Multi-Device Viewport Matrix

The **Multi-Device Viewport Matrix** enables running identical verification checks across diverse screen sizes, device scale factors, and touch settings to pinpoint precisely which layout configurations and screen geometries fail.

---

## 1. Viewport Profile Specification

Each viewport profile conforms to a strict validated schema (`ViewportProfile`):

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `id` | `string` | **Required** | Unique slug identifier (e.g. `desktop-1440x900`, `mobile-390x844`) |
| `name` | `string` | **Required** | Human-readable profile title |
| `label` | `string` | Preset Label | Descriptive label emphasizing preset status |
| `category` | `ViewportCategory` | `'custom'` | Category: `desktop`, `tablet`, `mobile`, `custom` |
| `width` | `number` (int) | **Required** | Viewport width in pixels (`240px` to `7680px`) |
| `height` | `number` (int) | **Required** | Viewport height in pixels (`240px` to `4320px`) |
| `deviceScaleFactor` | `number` | `1.0` | Device pixel ratio (DPR: `0.5` to `5.0`) |
| `hasTouch` | `boolean` | `false` | Enables touch event dispatch (`ontouchstart`, `TouchEvent`) |
| `isMobile` | `boolean` | `false` | Enables mobile meta viewport handling and mobile user agent |
| `userAgent` | `string` (opt) | None | Custom User-Agent string simulation |
| `isLandscape` | `boolean` | Inferred | `true` if `width > height`, else `false` |
| `enabled` | `boolean` | `true` | Whether profile is active during matrix execution |
| `disclaimer` | `string` | Standard | Mandatory notice distinguishing emulation from physical hardware |

---

## 2. Default Viewport Presets

PROOFix provides three standard presets by default:

1. **Desktop 1440×900** (`desktop-1440x900`):
   - Category: `desktop`
   - Scale: `1.0x`
   - Touch: `Disabled`
   - Mobile UA: `Disabled`
   - Disclaimer: *Synthetic browser emulation parameters (1440×900); not a guaranteed physical desktop monitor.*

2. **Tablet 768×1024** (`tablet-768x1024`):
   - Category: `tablet`
   - Scale: `2.0x`
   - Touch: `Enabled`
   - Mobile UA: `Enabled`
   - Disclaimer: *Synthetic browser emulation parameters (768×1024); not a guaranteed physical tablet device.*

3. **Mobile 390×844** (`mobile-390x844`):
   - Category: `mobile`
   - Scale: `3.0x`
   - Touch: `Enabled`
   - Mobile UA: `Enabled`
   - Disclaimer: *Synthetic browser emulation parameters (390×844); not a guaranteed physical mobile device.*

Users can enable, disable, customize dimensions, and add custom viewport presets using `src/lib/viewport/presets.ts`.

---

## 3. What Emulation Can and Cannot Prove

Software emulation uses Playwright Chromium with Chrome DevTools Protocol (CDP) emulation parameters. While powerful and fast for continuous integration, it is critical to distinguish synthetic emulation from testing on physical hardware.

### What Emulation CAN Prove:
- **CSS Media Queries**: Accurately verifies `@media (max-width: ...)`, `@media (orientation: ...)`, and container queries.
- **Document Boundary Containment**: Identifies layout elements that bleed past viewport bounds and create unintended horizontal scrollbars.
- **Responsive Navigation Drawer Logic**: Tests whether desktop navigation bars collapse into accessible hamburger toggles on smaller screens.
- **Touch Event Listeners**: Confirms that buttons and interactive components respond to synthetic `touchstart`, `touchend`, and `tap` events.
- **Accessible Touch Target Sizes**: Enforces that interactive elements maintain the minimum accessible sizing ($\ge 36\text{px}$ to $44\text{px}$).
- **Form Dry-Run Validation**: Tests validation messages, input field visibility, and form submission flows safely without external side-effects.

### What Emulation CANNOT Prove:
- **Proprietary Mobile Browser Engines**: Emulation runs inside Chromium. It **cannot** detect bugs specific to Apple WebKit (iOS Safari) or proprietary Samsung Internet engine quirks.
- **Physical Touch Digitizer Latency & Friction**: Software click/tap events lack the natural latency, velocity curves, palm rejection, and multi-finger pinch physics of real human hands.
- **Hardware Display Color Profiles & Safe Insets**: Cannot guarantee OLED P3 wide gamut reproduction, notch/Dynamic Island cutouts, or hardware rounded screen corners.
- **Device CPU & Thermal Throttling**: Emulation runs with the host CPU's high performance and does not simulate real battery conservation slowdowns or GPU memory constraints.
- **Native OS Virtual Keyboard Viewport Shifts**: Does not emulate the exact mobile OS soft keyboard appearing, changing `visualViewport` offset, or pushing fixed elements offscreen.

---

## 4. Horizontal Overflow Detection & Intentional Carousels

PROOFix detects unexpected document-level horizontal overflow (`document.documentElement.scrollWidth > window.innerWidth`).

To prevent false alarms on approved horizontal scroll components, the engine supports **configurable exceptions**:
- `.carousel`
- `.horizontal-scroll`
- `.overflow-x-auto` / `.overflow-x-scroll`
- `[data-intentional-overflow]`
- `[data-scrollable="true"]`
- `[data-carousel="true"]`
- `[role="region"][aria-label*="carousel"]`

Any element extending beyond the viewport that is contained inside an approved scrollable container is exempted. Real uncontained layout overflow (e.g. fixed-width tables, wide images, unconstrained preformatted code) is flagged with the exact overflow in pixels and offending element selectors.

---

## 5. Responsive Navigation & Form Verification

- **Navigation**: Verified per profile. Desktop requires direct visibility of primary links; mobile requires an accessible hamburger toggle (`button[aria-expanded]`, `.menu-toggle`) that successfully expands a drawer containing all destination links.
- **Forms**: Evaluated for visibility, occlusion by fixed bars, and minimum touch target size. All form submissions are intercepted by the verification harness, preventing unintended mutations to production or staging backends during dry-run testing.

---

## 6. Resource Limits & Partial-Failure Preservation

To guarantee matrix stability:
- **Profile Concurrency**: Bounded to a maximum worker pool (default: 2 concurrent browser contexts).
- **Profile Capping**: Default max of 6 profiles per run to prevent browser memory exhaustion.
- **Per-Profile Timeouts**: Each profile has an isolated 15-second timeout guard.
- **Partial-Failure Preservation**: If one profile crashes or times out, its explicit status (`failed` or `timeout`) is recorded, while all other completed profile results are preserved and reported. A mobile failure is never erased by a successful desktop run.
