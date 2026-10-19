import assert from 'node:assert/strict';
import {
  DEFAULT_VIDEO_CONFIG,
  VALID_RECORDING_MODES,
  validateVideoConfig,
  resolveVideoConfig,
  validateResolution,
  validateRetentionPolicy,
} from '../src/lib/video/recording-config.ts';

console.log('--- Testing Recording Configuration (Contribution 61) ---');

// 1. Defaults preserve existing behavior
function testDefaultConfig() {
  const defaults = validateVideoConfig();
  assert.equal(defaults.enabled, false, 'Recording must be disabled by default to preserve existing behavior');
  assert.equal(defaults.mode, 'off', 'Recording mode must default to "off"');
  assert.equal(defaults.resolution.width, 1280);
  assert.equal(defaults.resolution.height, 720);
  assert.equal(defaults.retention.maxAgeDays, 14);
  assert.equal(defaults.retention.maxTotalStorageMb, 500);
  assert.equal(defaults.retention.maxPerFileMb, 50);
  console.log('[PASS] Default recording config strictly preserves existing non-recording behavior.');
}

// 2. Valid custom configs
function testValidConfigs() {
  for (const mode of ['all', 'only-on-failure', 'retain-on-failure']) {
    const config = validateVideoConfig({ mode });
    assert.equal(config.mode, mode);
    assert.equal(config.enabled, true, `Mode "${mode}" should automatically enable recording`);
  }

  const custom = validateVideoConfig({
    mode: 'only-on-failure',
    resolution: { width: 1920, height: 1080 },
    fps: 30,
    retention: {
      maxAgeDays: 30,
      maxTotalStorageMb: 2000,
      maxPerFileMb: 100,
    },
  });

  assert.equal(custom.mode, 'only-on-failure');
  assert.equal(custom.resolution.width, 1920);
  assert.equal(custom.resolution.height, 1080);
  assert.equal(custom.fps, 30);
  assert.equal(custom.retention.maxAgeDays, 30);
  console.log('[PASS] Valid custom modes, resolutions, and retention preferences accepted.');
}

// 3. Reject invalid recording settings
function testInvalidConfigs() {
  // Invalid mode
  assert.throws(() => {
    validateVideoConfig({ mode: 'invalid_mode' });
  }, /Invalid recording mode/);

  // Invalid resolution width
  assert.throws(() => {
    validateResolution({ width: 200, height: 600 });
  }, /Invalid video width/);

  // Invalid resolution height
  assert.throws(() => {
    validateResolution({ width: 1280, height: 100 });
  }, /Invalid video height/);

  // Non-integer resolution
  assert.throws(() => {
    validateResolution({ width: 1280.5, height: 720 });
  }, /Width must be an integer/);

  // Invalid retention
  assert.throws(() => {
    validateRetentionPolicy({ maxAgeDays: 0, maxTotalStorageMb: 500, maxPerFileMb: 50 });
  }, /Invalid retention maxAgeDays/);

  assert.throws(() => {
    validateRetentionPolicy({ maxAgeDays: 14, maxTotalStorageMb: 5, maxPerFileMb: 50 });
  }, /Invalid maxTotalStorageMb/);

  console.log('[PASS] Invalid recording settings, resolutions, and retention preferences are rejected.');
}

// 4. Overrides and resolution merge
function testResolveVideoConfig() {
  const base = {
    mode: 'only-on-failure',
    resolution: { width: 1280, height: 720 },
  };

  const override = {
    resolution: { width: 1920, height: 1080 },
  };

  const resolved = resolveVideoConfig(base, override);
  assert.equal(resolved.mode, 'only-on-failure');
  assert.equal(resolved.resolution.width, 1920);
  assert.equal(resolved.resolution.height, 1080);
  console.log('[PASS] Recording config resolution and overrides merged correctly.');
}

testDefaultConfig();
testValidConfigs();
testInvalidConfigs();
testResolveVideoConfig();

console.log('[ALL PASS] Contribution 61 test suite passed.');
