import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WebSocketSessionManager,
  globalWebSocketSessionManager,
} from '../src/lib/companion/websocket-session-manager.ts';

test('WebSocketSessionManager manages client rooms and routing', () => {
  const manager = new WebSocketSessionManager();

  const host = manager.joinSession('room-1', 'client-host-1', 'host');
  const viewer = manager.joinSession('room-1', 'client-viewer-2', 'viewer');

  assert.equal(manager.getActiveSessionCount(), 1);
  const clients = manager.getSessionClients('room-1');
  assert.equal(clients.length, 2);

  const targets = manager.routeSignalingMessage({
    sessionId: 'room-1',
    senderId: 'client-viewer-2',
    type: 'offer',
    timestamp: new Date().toISOString(),
  });

  assert.equal(targets.length, 1);
  assert.equal(targets[0], 'client-host-1'); // routed to peer

  manager.leaveSession('room-1', 'client-viewer-2');
  assert.equal(manager.getSessionClients('room-1').length, 1);
});

test('dispatchControlCommand delivers interactive debugger commands to registered handler', async () => {
  const manager = new WebSocketSessionManager();
  manager.joinSession('room-debug', 'host-1', 'host');

  let executedCommand = null;
  manager.registerCommandHandler('room-debug', (cmd) => {
    executedCommand = cmd;
  });

  const success = await manager.dispatchControlCommand({
    commandId: 'cmd-1',
    sessionId: 'room-debug',
    type: 'step_into',
    timestamp: new Date().toISOString(),
  });

  assert.equal(success, true);
  assert.ok(executedCommand);
  assert.equal(executedCommand.type, 'step_into');
});
