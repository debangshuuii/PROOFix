import assert from 'node:assert/strict';
import { activate, deactivate } from '../extensions/vscode-proofix/src/extension.ts';

console.log('Testing VS Code Extension Lifecycle & Subsystems...');

const mockContext = {
  subscriptions: [],
};

const instance = activate(mockContext);
assert.equal(instance.isActivated, true, 'Extension must be active');
assert.ok(instance.routeIndex, 'RouteIndex initialized');
assert.ok(instance.gutterDecorations, 'GutterDecorations initialized');
assert.ok(instance.codeLensProvider, 'CodeLensProvider initialized');
assert.ok(instance.testController, 'TestController initialized');
assert.ok(instance.patchManager, 'PatchManager initialized');
assert.ok(instance.statusBar, 'StatusBar initialized');
assert.ok(instance.apiClient, 'ApiClient initialized');
assert.equal(mockContext.subscriptions.length, 1, 'Dispose hook registered in subscriptions');

// Deactivate
deactivate(instance);
assert.equal(instance.isActivated, false, 'Extension must be deactivated');

console.log('✅ VS Code Extension Lifecycle tests passed!');
