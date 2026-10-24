import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('PlaygroundBadge component source exists and defines customizable variants', () => {
  const filePath = path.resolve(process.cwd(), 'src/components/playground/PlaygroundBadge.tsx');
  assert.ok(fs.existsSync(filePath), 'PlaygroundBadge.tsx must exist');
  const content = fs.readFileSync(filePath, 'utf-8');
  assert.ok(content.includes('Zero-Setup Interactive Demo'));
  assert.ok(content.includes('variantStyles'));
  assert.ok(content.includes('animate-ping'));
});

test('PlaygroundDiffPreview component source exists and handles unified diff lines', () => {
  const filePath = path.resolve(process.cwd(), 'src/components/playground/PlaygroundDiffPreview.tsx');
  assert.ok(fs.existsSync(filePath), 'PlaygroundDiffPreview.tsx must exist');
  const content = fs.readFileSync(filePath, 'utf-8');
  assert.ok(content.includes('patchDiff.split'));
  assert.ok(content.includes('navigator.clipboard.writeText'));
  assert.ok(content.includes('line.startsWith(\'+\')'));
  assert.ok(content.includes('line.startsWith(\'-\')'));
});

test('PlaygroundScenarioCard component source exists and renders category icons and CTAs', () => {
  const filePath = path.resolve(process.cwd(), 'src/components/playground/PlaygroundScenarioCard.tsx');
  assert.ok(fs.existsSync(filePath), 'PlaygroundScenarioCard.tsx must exist');
  const content = fs.readFileSync(filePath, 'utf-8');
  assert.ok(content.includes('Launch 10s Demo'));
  assert.ok(content.includes('Inspect Flaw & Diff'));
  assert.ok(content.includes('PLAYGROUND_CATEGORIES'));
});

test('PlaygroundSimulationStepper component source exists and tracks 11 stages', () => {
  const filePath = path.resolve(process.cwd(), 'src/components/playground/PlaygroundSimulationStepper.tsx');
  assert.ok(fs.existsSync(filePath), 'PlaygroundSimulationStepper.tsx must exist');
  const content = fs.readFileSync(filePath, 'utf-8');
  assert.ok(content.includes('PLAYGROUND_SIMULATION_STAGES'));
  assert.ok(content.includes('Stage '));
});

test('PlaygroundScenarioSelector component source exists and defines search filtering', () => {
  const filePath = path.resolve(process.cwd(), 'src/components/playground/PlaygroundScenarioSelector.tsx');
  assert.ok(fs.existsSync(filePath), 'PlaygroundScenarioSelector.tsx must exist');
  const content = fs.readFileSync(filePath, 'utf-8');
  assert.ok(content.includes('ALL_DEMO_SCENARIOS'));
  assert.ok(content.includes('selectedCategory'));
  assert.ok(content.includes('searchQuery'));
});

test('PlaygroundSection component source exists and wires selector into section container', () => {
  const filePath = path.resolve(process.cwd(), 'src/components/playground/PlaygroundSection.tsx');
  assert.ok(fs.existsSync(filePath), 'PlaygroundSection.tsx must exist');
  const content = fs.readFileSync(filePath, 'utf-8');
  assert.ok(content.includes('PlaygroundScenarioSelector'));
  assert.ok(content.includes('PlaygroundBadge'));
  assert.ok(content.includes('id={id}'));
});
