import assert from 'node:assert/strict';
import {
  buildPlaywrightEmulationContext,
  generateEmulationDistinctionReport,
  DEFAULT_MOBILE_USER_AGENT,
} from '../src/lib/viewport/touch-emulator.ts';
import { getDefaultViewportPresets } from '../src/lib/viewport/presets.ts';

console.log('--- Testing Touch Emulation & Emulation vs Real-Device Distinction (Contribution 48) ---');

const presets = getDefaultViewportPresets();
const desktopProfile = presets.find((p) => p.id === 'desktop-1440x900');
const mobileProfile = presets.find((p) => p.id === 'mobile-390x844');

assert.ok(desktopProfile);
assert.ok(mobileProfile);

// 1. Verify Desktop Playwright Context Options
const desktopContext = buildPlaywrightEmulationContext(desktopProfile);
assert.equal(desktopContext.viewport.width, 1440);
assert.equal(desktopContext.viewport.height, 900);
assert.equal(desktopContext.hasTouch, false, 'Desktop must have touch disabled');
assert.equal(desktopContext.isMobile, false, 'Desktop must have isMobile disabled');
assert.equal(desktopContext.deviceScaleFactor, 1.0);
console.log('[PASS] Desktop emulation context honors desktop configuration.');

// 2. Verify Mobile Playwright Context Options
const mobileContext = buildPlaywrightEmulationContext(mobileProfile);
assert.equal(mobileContext.viewport.width, 390);
assert.equal(mobileContext.viewport.height, 844);
assert.equal(mobileContext.hasTouch, true, 'Mobile profile must honor hasTouch: true');
assert.equal(mobileContext.isMobile, true, 'Mobile profile must honor isMobile: true');
assert.equal(mobileContext.deviceScaleFactor, 3.0, 'Mobile profile must honor deviceScaleFactor: 3.0');
assert.ok(mobileContext.userAgent?.includes('Safari') || mobileContext.userAgent?.includes('PROOFix'));
console.log('[PASS] Mobile emulation context honors touch, scale, and mobile UA.');

// 3. Custom touch configuration honored
const customTouchProfile = {
  ...desktopProfile,
  id: 'touch-kiosk',
  name: 'Touch Kiosk Monitor',
  hasTouch: true, // Custom touch enabled on large desktop monitor
  deviceScaleFactor: 2.0,
};
const customContext = buildPlaywrightEmulationContext(customTouchProfile);
assert.equal(customContext.hasTouch, true);
assert.equal(customContext.viewport.width, 1440);
assert.equal(customContext.deviceScaleFactor, 2.0);
console.log('[PASS] Custom touch configuration overrides are honored.');

// 4. Distinction Report (Emulation vs Real Physical Device)
const distinctionReport = generateEmulationDistinctionReport(mobileProfile);

assert.equal(distinctionReport.isEmulated, true);
assert.equal(distinctionReport.hardwareDeviceGuaranteed, false);
assert.equal(distinctionReport.executionMode, 'synthetic_software_emulation');

// Verify proven capabilities
assert.ok(distinctionReport.provenByEmulation.some((p) => p.includes('CSS media query')));
assert.ok(distinctionReport.provenByEmulation.some((p) => p.includes('touch event dispatch')));
assert.ok(distinctionReport.provenByEmulation.some((p) => p.includes('Touch target size')));

// Verify unproven hardware limitations
assert.ok(distinctionReport.cannotBeProvenByEmulation.some((u) => u.includes('digitizer touch latency')));
assert.ok(distinctionReport.cannotBeProvenByEmulation.some((u) => u.includes('WebKit / Safari iOS')));
assert.ok(distinctionReport.cannotBeProvenByEmulation.some((u) => u.includes('battery drain')));

// Verify clear distinction disclaimer
assert.ok(distinctionReport.distinctionDisclaimer.includes('CRITICAL DISTINCTION'));
assert.ok(distinctionReport.distinctionDisclaimer.includes('DOES NOT guarantee physical device hardware'));
console.log('[PASS] Emulation distinction report clearly separates synthetic simulation from physical device hardware.');

console.log('All Touch Emulation tests passed successfully.');
