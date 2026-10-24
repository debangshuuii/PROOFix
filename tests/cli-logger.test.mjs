import test from 'node:test';
import assert from 'node:assert/strict';
import { CliLogger } from '../src/lib/cli/logger.ts';
import { stripAnsi } from '../src/lib/cli/colors.ts';

test('logger: buffer captures messages when enabled', () => {
  const logger = new CliLogger({ captureLogs: true, level: 'debug', tag: 'TEST' });
  logger.info('System initialization starting');
  logger.success('Check passed');
  logger.warn('Low disk space');
  logger.error('Connection timed out');

  const logs = logger.getCapturedLogs();
  assert.equal(logs.length, 4);

  const plainLogs = logs.map(stripAnsi);
  assert.ok(plainLogs[0].includes('[TEST]'));
  assert.ok(plainLogs[0].includes('System initialization starting'));
  assert.ok(plainLogs[1].includes('Check passed'));
  assert.ok(plainLogs[2].includes('Low disk space'));
  assert.ok(plainLogs[3].includes('Connection timed out'));
});

test('logger: respects log level filtering', () => {
  const logger = new CliLogger({ captureLogs: true, level: 'warn' });
  logger.debug('Debug trace');
  logger.info('General info');
  logger.warn('Warning condition');
  logger.error('Critical failure');

  const logs = logger.getCapturedLogs();
  assert.equal(logs.length, 2);
  const plain = logs.map(stripAnsi).join('\n');
  assert.ok(!plain.includes('Debug trace'));
  assert.ok(!plain.includes('General info'));
  assert.ok(plain.includes('Warning condition'));
  assert.ok(plain.includes('Critical failure'));
});

test('logger: createChild inherits and extends tags', () => {
  const parent = new CliLogger({ captureLogs: true, tag: 'CORE' });
  const child = parent.createChild('RUNNER');
  child.info('Child event');

  const logs = child.getCapturedLogs();
  assert.equal(logs.length, 1);
  assert.ok(stripAnsi(logs[0]).includes('[CORE:RUNNER]'));
});
