import { RouteIndex } from './route-index';
import { GutterDecorationProvider } from './gutter-decorations';
import { RouteCodeLensProvider } from './codelens-provider';
import { ProofixTestController } from './test-controller';
import { PatchManager } from './patch-manager';
import { ProofixStatusBarItem } from './status-bar';
import { ProofixApiClient } from './api-client';

export interface ExtensionContextMock {
  subscriptions: Array<{ dispose: () => any }>;
}

export interface ProofixExtensionInstance {
  routeIndex: RouteIndex;
  gutterDecorations: GutterDecorationProvider;
  codeLensProvider: RouteCodeLensProvider;
  testController: ProofixTestController;
  patchManager: PatchManager;
  statusBar: ProofixStatusBarItem;
  apiClient: ProofixApiClient;
  isActivated: boolean;
}

/**
 * Activates the PROOFix VS Code & Cursor extension.
 */
export function activate(context?: ExtensionContextMock): ProofixExtensionInstance {
  const routeIndex = new RouteIndex();
  const gutterDecorations = new GutterDecorationProvider();
  const codeLensProvider = new RouteCodeLensProvider();
  const testController = new ProofixTestController();
  const patchManager = new PatchManager();
  const statusBar = new ProofixStatusBarItem();
  const apiClient = new ProofixApiClient('http://localhost:3000');

  // Initialize status bar
  statusBar.setCounts(0, 0, 0);

  const instance: ProofixExtensionInstance = {
    routeIndex,
    gutterDecorations,
    codeLensProvider,
    testController,
    patchManager,
    statusBar,
    apiClient,
    isActivated: true,
  };

  if (context && context.subscriptions) {
    context.subscriptions.push({
      dispose: () => deactivate(instance),
    });
  }

  return instance;
}

/**
 * Deactivates the extension, cleaning up disposables and caches.
 */
export function deactivate(instance?: ProofixExtensionInstance): void {
  if (instance) {
    instance.routeIndex.clear();
    instance.gutterDecorations.clear();
    instance.patchManager.clear();
    instance.isActivated = false;
  }
}
