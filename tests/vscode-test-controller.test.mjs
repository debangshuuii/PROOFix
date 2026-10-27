import assert from 'node:assert/strict';
import { ProofixTestController } from '../extensions/vscode-proofix/src/test-controller.ts';

console.log('Testing VS Code TestController Hierarchy...');

const controller = new ProofixTestController();

const routes = [
  {
    routePath: '/dashboard',
    filePath: 'src/app/dashboard/page.tsx',
    line: 10,
    isApi: false,
    isDynamic: false,
    exportName: 'DashboardPage',
  },
  {
    routePath: '/api/v1/health',
    filePath: 'src/app/api/v1/health/route.ts',
    line: 5,
    isApi: true,
    isDynamic: false,
    exportName: 'GET',
  },
];

controller.populateFromRoutes(routes);

// Verify root node
const root = controller.getNodeById('project_root');
assert.ok(root, 'Root project node must exist');
assert.equal(root.children.size, 2, 'Must have Page Routes and API Routes');

// Verify category children
const pageRoutes = root.children.get('Page Routes');
assert.ok(pageRoutes);
assert.ok(pageRoutes.children.has('route:/dashboard'));

const apiRoutes = root.children.get('API Routes');
assert.ok(apiRoutes);
assert.ok(apiRoutes.children.has('route:/api/v1/health'));

// Verify leaf journeys
const totalLeafs = controller.getAllLeafJourneys();
assert.equal(totalLeafs.length, 4, 'Each route should have 2 default leaf journeys');

console.log('✅ VS Code TestController Hierarchy tests passed!');
