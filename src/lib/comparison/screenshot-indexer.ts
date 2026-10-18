import fs from 'fs';
import path from 'path';
import { db } from '../db';
import {
  ScreenshotMetadata,
  ScreenshotQueryFilter,
  ViewportDimension,
} from '../types/visual-regression';

const DATA_DIR = path.join(process.cwd(), 'data');
const INDEX_FILE = path.join(DATA_DIR, 'screenshot_index.json');

let inMemoryIndex: ScreenshotMetadata[] | null = null;
let writeQueue: Promise<void> = Promise.resolve();

/**
 * Validates that a screenshot metadata record complies with the required schema.
 */
export function validateScreenshotMetadata(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Metadata must be a non-null object'] };
  }

  if (!data.id || typeof data.id !== 'string' || data.id.trim() === '') {
    errors.push('Screenshot ID must be a non-empty string');
  }

  if (!data.runId || typeof data.runId !== 'string' || data.runId.trim() === '') {
    errors.push('Run ID is required and must be a non-empty string');
  }

  if (!data.route || typeof data.route !== 'string' || !data.route.startsWith('/')) {
    errors.push('Route must be a non-empty string starting with "/"');
  }

  if (
    !data.viewport ||
    typeof data.viewport !== 'object' ||
    typeof data.viewport.width !== 'number' ||
    typeof data.viewport.height !== 'number' ||
    data.viewport.width <= 0 ||
    data.viewport.height <= 0
  ) {
    errors.push('Viewport must specify positive width and height numbers');
  }

  if (!data.browser || typeof data.browser !== 'string' || data.browser.trim() === '') {
    errors.push('Browser engine must be specified');
  }

  if (!data.timestamp || isNaN(Date.parse(data.timestamp))) {
    errors.push('Timestamp must be a valid ISO 8601 date string');
  }

  if (
    !data.testContext ||
    typeof data.testContext !== 'object' ||
    !data.testContext.testName ||
    typeof data.testContext.testName !== 'string'
  ) {
    errors.push('Test context must specify a non-empty testName');
  }

  if (!data.filePath || typeof data.filePath !== 'string') {
    errors.push('Screenshot filePath must be specified');
  }

  const validFormats = ['png', 'jpeg', 'webp'];
  if (data.format && !validFormats.includes(data.format)) {
    errors.push(`Format must be one of: ${validFormats.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

async function loadIndex(): Promise<ScreenshotMetadata[]> {
  if (inMemoryIndex) return inMemoryIndex;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(INDEX_FILE)) {
    inMemoryIndex = [];
    fs.writeFileSync(INDEX_FILE, JSON.stringify([], null, 2), 'utf-8');
    return inMemoryIndex;
  }

  try {
    const raw = fs.readFileSync(INDEX_FILE, 'utf-8');
    inMemoryIndex = JSON.parse(raw);
    return inMemoryIndex!;
  } catch (err) {
    console.error('Error reading screenshot_index.json, resetting index:', err);
    inMemoryIndex = [];
    return inMemoryIndex;
  }
}

async function persistIndex(): Promise<void> {
  if (!inMemoryIndex) return;
  const snapshot = JSON.stringify(inMemoryIndex, null, 2);
  const tempFile = `${INDEX_FILE}.${Date.now()}.tmp`;

  writeQueue = writeQueue.then(async () => {
    try {
      await fs.promises.writeFile(tempFile, snapshot, 'utf-8');
      await fs.promises.rename(tempFile, INDEX_FILE);
    } catch (err) {
      console.error('Failed to persist screenshot index:', err);
      try {
        if (fs.existsSync(tempFile)) await fs.promises.unlink(tempFile);
      } catch {}
    }
  });

  await writeQueue;
}

/**
 * Registers and persists a new screenshot in the index after validating its schema.
 */
export async function registerScreenshot(
  metadata: ScreenshotMetadata
): Promise<ScreenshotMetadata> {
  const validation = validateScreenshotMetadata(metadata);
  if (!validation.valid) {
    throw new Error(`Invalid screenshot metadata: ${validation.errors.join('; ')}`);
  }

  const index = await loadIndex();
  const existingIdx = index.findIndex((s) => s.id === metadata.id);

  if (existingIdx !== -1) {
    index[existingIdx] = metadata;
  } else {
    index.unshift(metadata);
  }

  await persistIndex();
  return metadata;
}

/**
 * Queries indexed screenshots by compatible route, viewport, browser, run, and test context.
 */
export async function queryScreenshots(
  filter: ScreenshotQueryFilter = {}
): Promise<ScreenshotMetadata[]> {
  const index = await loadIndex();

  return index.filter((item) => {
    if (filter.projectId && item.projectId !== filter.projectId) {
      return false;
    }
    if (filter.runId && item.runId !== filter.runId) {
      return false;
    }
    if (filter.route && item.route !== filter.route) {
      return false;
    }
    if (filter.browser && item.browser.toLowerCase() !== filter.browser.toLowerCase()) {
      return false;
    }
    if (filter.viewport) {
      if (
        item.viewport.width !== filter.viewport.width ||
        item.viewport.height !== filter.viewport.height
      ) {
        return false;
      }
    }
    if (
      filter.testName &&
      !item.testContext.testName.toLowerCase().includes(filter.testName.toLowerCase())
    ) {
      return false;
    }
    if (
      filter.category &&
      item.testContext.category?.toLowerCase() !== filter.category.toLowerCase()
    ) {
      return false;
    }
    if (filter.tag && (!item.testContext.tags || !item.testContext.tags.includes(filter.tag))) {
      return false;
    }
    if (filter.since && new Date(item.timestamp) < new Date(filter.since)) {
      return false;
    }
    if (filter.until && new Date(item.timestamp) > new Date(filter.until)) {
      return false;
    }
    return true;
  });
}

/**
 * Retrieves a single screenshot by its unique identifier.
 */
export async function getScreenshotById(id: string): Promise<ScreenshotMetadata | null> {
  const index = await loadIndex();
  return index.find((s) => s.id === id) || null;
}

/**
 * Scans existing test results across verification runs and indexes any screenshot artifacts.
 */
export async function indexExistingArtifacts(options?: {
  projectId?: string;
}): Promise<ScreenshotMetadata[]> {
  const runs = await db.getRuns(options?.projectId);
  const newlyIndexed: ScreenshotMetadata[] = [];

  for (const run of runs) {
    const testResults = await db.getTestResults(run.id);

    for (const test of testResults) {
      const screenshotPath = test.evidence?.screenshotPath;
      if (!screenshotPath) continue;

      // Deduce route from test details
      let route = '/';
      if (test.name.toLowerCase().includes('about')) {
        route = '/about';
      } else if (
        test.name.toLowerCase().includes('broken') ||
        test.errorDetails?.url?.includes('broken-route')
      ) {
        route = '/broken-route';
      } else if (
        test.name.toLowerCase().includes('api') ||
        test.errorDetails?.url?.includes('/api/data')
      ) {
        route = '/api/data';
      }

      const id = `sc_${run.id}_${test.id}`;
      const metadata: ScreenshotMetadata = {
        id,
        runId: run.id,
        projectId: run.projectId,
        route,
        viewport: test.evidence?.viewport || { width: 1280, height: 720 },
        browser: 'chromium',
        browserVersion: '124.0',
        timestamp: test.completedAt || run.startedAt,
        testContext: {
          testResultId: test.id,
          testName: test.name,
          category: test.category,
          selector: 'fullPage',
          tags: ['automated', test.category],
        },
        filePath: screenshotPath,
        format: 'png',
      };

      try {
        await registerScreenshot(metadata);
        newlyIndexed.push(metadata);
      } catch (err) {
        console.warn(`Failed to index screenshot for test ${test.id}:`, err);
      }
    }
  }

  return newlyIndexed;
}

/**
 * Resets the in-memory and disk index.
 */
export async function clearScreenshotIndex(): Promise<void> {
  inMemoryIndex = [];
  if (fs.existsSync(INDEX_FILE)) {
    await fs.promises.unlink(INDEX_FILE).catch(() => {});
  }
}
