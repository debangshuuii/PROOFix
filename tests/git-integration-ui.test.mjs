import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('GitIntegrationDashboard component file exists and contains essential features', () => {
  const filePath = path.join(process.cwd(), 'src/components/integrations/GitIntegrationDashboard.tsx');
  assert.ok(fs.existsSync(filePath), 'Component file must exist');

  const content = fs.readFileSync(filePath, 'utf8');
  assert.ok(content.includes('Native Git Integrations & Webhook Ingestion'));
  assert.ok(content.includes('1-Click Apply Self-Healing Patch'));
  assert.ok(content.includes('Simulate GitHub PR'));
  assert.ok(content.includes('Simulate GitLab MR'));
  assert.ok(content.includes('filteredRuns'));
});

test('Git Integration page route exists and renders component', () => {
  const pagePath = path.join(process.cwd(), 'src/app/integrations/git/page.tsx');
  assert.ok(fs.existsSync(pagePath), 'Page route file must exist');

  const content = fs.readFileSync(pagePath, 'utf8');
  assert.ok(content.includes('GitIntegrationDashboard'));
  assert.ok(content.includes('Git Integrations & Check Runs'));
});
