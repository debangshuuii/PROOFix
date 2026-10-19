import assert from 'node:assert/strict';
import {
  getDefaultViewportPresets,
  setPresetEnabled,
  customizePreset,
  addCustomPreset,
  removePreset,
  getEnabledPresets,
} from '../src/lib/viewport/presets.ts';

console.log('--- Testing Default Viewport Presets & Customization (Contribution 42) ---');

// 1. Verify default presets
const defaults = getDefaultViewportPresets();
assert.equal(defaults.length, 3, 'Must have 3 default presets');

const desktop = defaults.find((p) => p.id === 'desktop-1440x900');
assert.ok(desktop, 'Desktop preset must exist');
assert.equal(desktop.width, 1440);
assert.equal(desktop.height, 900);
assert.equal(desktop.hasTouch, false);
assert.equal(desktop.isMobile, false);
assert.ok(desktop.label.includes('Preset'));
assert.ok(desktop.disclaimer.includes('not a guaranteed physical desktop monitor'));

const tablet = defaults.find((p) => p.id === 'tablet-768x1024');
assert.ok(tablet, 'Tablet preset must exist');
assert.equal(tablet.width, 768);
assert.equal(tablet.height, 1024);
assert.equal(tablet.hasTouch, true);
assert.equal(tablet.isMobile, true);
assert.ok(tablet.disclaimer.includes('not a guaranteed physical tablet device'));

const mobile = defaults.find((p) => p.id === 'mobile-390x844');
assert.ok(mobile, 'Mobile preset must exist');
assert.equal(mobile.width, 390);
assert.equal(mobile.height, 844);
assert.equal(mobile.hasTouch, true);
assert.equal(mobile.isMobile, true);
assert.ok(mobile.disclaimer.includes('not a guaranteed physical mobile device'));
console.log('[PASS] Default presets (1440x900, 768x1024, 390x844) verified with explicit emulation disclaimers.');

// 2. Enable / Disable presets
let current = setPresetEnabled(defaults, 'mobile-390x844', false);
assert.equal(current.find((p) => p.id === 'mobile-390x844')?.enabled, false);
assert.equal(getEnabledPresets(current).length, 2, 'Only 2 enabled presets remain');

current = setPresetEnabled(current, 'mobile-390x844', true);
assert.equal(current.find((p) => p.id === 'mobile-390x844')?.enabled, true);
assert.equal(getEnabledPresets(current).length, 3);
console.log('[PASS] Presets can be enabled and disabled dynamically.');

// 3. Customize preset
const customized = customizePreset(current, 'desktop-1440x900', {
  width: 1920,
  height: 1080,
  name: 'Custom Desktop 1080p',
});
const updatedDesktop = customized.find((p) => p.id === 'desktop-1440x900');
assert.equal(updatedDesktop?.width, 1920);
assert.equal(updatedDesktop?.height, 1080);
assert.equal(updatedDesktop?.name, 'Custom Desktop 1080p');
console.log('[PASS] Existing preset customized with validated dimensions.');

// 4. Reject invalid customization
assert.throws(() => {
  customizePreset(current, 'desktop-1440x900', { width: -100 });
}, /Invalid preset customization/);
console.log('[PASS] Invalid customization rejected by schema.');

// 5. Add custom preset
const withCustom = addCustomPreset(current, {
  id: 'watch-200x200',
  name: 'Ultra Compact Watch',
  label: 'Watch Viewport Preset (240x280)',
  category: 'custom',
  width: 240,
  height: 280,
  deviceScaleFactor: 2,
  hasTouch: true,
  isMobile: true,
  enabled: true,
  disclaimer: 'Ultra-small wearable viewport preset',
});
assert.equal(withCustom.length, 4);
assert.equal(withCustom.find((p) => p.id === 'watch-200x200')?.custom, true);
console.log('[PASS] Custom preset added and validated.');

// 6. Delete custom preset vs cannot delete built-in preset
const cleaned = removePreset(withCustom, 'watch-200x200');
assert.equal(cleaned.length, 3);

assert.throws(() => {
  removePreset(cleaned, 'desktop-1440x900');
}, /Default preset "desktop-1440x900" cannot be removed/);
console.log('[PASS] Custom presets removable while default presets protected.');

console.log('All Viewport Presets tests passed successfully.');
