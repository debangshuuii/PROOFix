import assert from 'node:assert/strict';
import {
  SUPPORTED_NOTIFICATION_EVENTS,
  SUPPORTED_NOTIFICATION_CHANNELS,
  getDefaultNotificationSettings,
  validateNotificationSettings,
  validateNotificationEvent,
  isEventEligibleForDelivery,
} from '../src/lib/notifications/schema.ts';

console.log('--- Testing Notification Settings & Event Schema (Contribution 81) ---');

function testDefaultSettings() {
  const defaults = getDefaultNotificationSettings('proj_alpha');

  // Done when: configuration is validated and defaults do not send unsolicited notifications.
  assert.equal(defaults.projectId, 'proj_alpha');
  assert.equal(defaults.enabled, false, 'Default notification settings MUST be disabled to prevent unsolicited alerts');
  assert.equal(defaults.channels.length, 0);
  assert.equal(defaults.deliveryPreferences.minSeverity, 'failures_only');
  assert.equal(defaults.deliveryPreferences.includeReportLink, true);
  assert.equal(defaults.deliveryPreferences.includeSummary, true);
  console.log('[PASS] Default notification settings strictly disable unsolicited delivery.');
}

function testSchemaValidation() {
  // Valid settings
  const validResult = validateNotificationSettings(
    {
      enabled: true,
      channels: [
        {
          id: 'ch_slack_01',
          channelType: 'slack',
          enabled: true,
          hasSecret: true,
          notifyOnEvents: ['run.failed', 'regression.detected'],
        },
        {
          id: 'ch_discord_01',
          channelType: 'discord',
          enabled: false,
          hasSecret: true,
          notifyOnEvents: ['run.completed'],
        },
      ],
      deliveryPreferences: {
        minSeverity: 'all',
        includeReportLink: true,
      },
    },
    'proj_valid'
  );

  assert.equal(validResult.valid, true);
  assert.equal(validResult.settings.enabled, true);
  assert.equal(validResult.settings.channels.length, 2);
  assert.equal(validResult.settings.channels[0].channelType, 'slack');
  assert.equal(validResult.settings.deliveryPreferences.minSeverity, 'all');

  // Rejection of invalid channel type
  const badChannelResult = validateNotificationSettings(
    {
      channels: [
        {
          id: 'ch_bad',
          channelType: 'unsupported_telegram',
          enabled: true,
        },
      ],
    },
    'proj_bad'
  );
  assert.equal(badChannelResult.valid, false);
  assert.ok(badChannelResult.errors.some((e) => e.includes('invalid channelType')));

  // Rejection of invalid event type
  const badEventResult = validateNotificationSettings(
    {
      channels: [
        {
          id: 'ch_bad_ev',
          channelType: 'slack',
          enabled: true,
          notifyOnEvents: ['unknown.event.type'],
        },
      ],
    },
    'proj_bad_ev'
  );
  assert.equal(badEventResult.valid, false);
  assert.ok(badEventResult.errors.some((e) => e.includes('unsupported event type')));

  console.log('[PASS] Schema validator accepts valid configs and rejects unsupported channels/events.');
}

function testEventEligibility() {
  const settings = {
    projectId: 'proj_beta',
    enabled: true,
    channels: [],
    deliveryPreferences: {
      minSeverity: 'failures_only',
      includeReportLink: true,
      includeSummary: true,
    },
    updatedAt: new Date().toISOString(),
  };

  const channel = {
    id: 'ch_slack_prod',
    channelType: 'slack',
    enabled: true,
    hasSecret: true,
    notifyOnEvents: ['run.failed', 'regression.detected'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const passedEvent = {
    id: 'ev_01',
    eventType: 'run.completed',
    projectId: 'proj_beta',
    projectName: 'Beta Project',
    status: 'passed',
    summary: 'Verification run passed cleanly',
    timestamp: new Date().toISOString(),
  };

  const failedEvent = {
    id: 'ev_02',
    eventType: 'run.failed',
    projectId: 'proj_beta',
    projectName: 'Beta Project',
    status: 'failed',
    summary: 'Verification run failed with 2 errors',
    timestamp: new Date().toISOString(),
  };

  // 1. Channel not subscribed to run.completed
  const passedCheck = isEventEligibleForDelivery(passedEvent, channel, settings);
  assert.equal(passedCheck.eligible, false);

  // 2. Channel subscribed to run.failed & passes failures_only filter
  const failedCheck = isEventEligibleForDelivery(failedEvent, channel, settings);
  assert.equal(failedCheck.eligible, true);

  // 3. When master settings.enabled is false, delivery is blocked
  const disabledSettings = { ...settings, enabled: false };
  const masterDisabledCheck = isEventEligibleForDelivery(failedEvent, channel, disabledSettings);
  assert.equal(masterDisabledCheck.eligible, false);
  assert.ok(masterDisabledCheck.reason.includes('disabled'));

  // 4. Test events bypass ordinary filters
  const testEvent = {
    id: 'ev_test',
    eventType: 'run.failed',
    projectId: 'proj_beta',
    projectName: 'Beta Project',
    summary: 'Test notification',
    timestamp: new Date().toISOString(),
    isTest: true,
  };
  const testCheck = isEventEligibleForDelivery(testEvent, channel, disabledSettings);
  assert.equal(testCheck.eligible, true, 'Test event must be deliverable when channel has secret');

  console.log('[PASS] Delivery eligibility engine enforces subscription, master switch, and severity rules.');
}

function runTests() {
  testDefaultSettings();
  testSchemaValidation();
  testEventEligibility();
  console.log('[ALL PASS] Contribution 81 test suite passed.');
}

runTests();
