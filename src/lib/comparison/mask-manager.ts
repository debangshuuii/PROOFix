import fs from 'fs';
import path from 'path';
import { MaskRegion } from '../types/visual-regression';

const DATA_DIR = path.join(process.cwd(), 'data');
const MASKS_FILE = path.join(DATA_DIR, 'project_masks.json');

interface ProjectMasksStore {
  [projectId: string]: MaskRegion[];
}

let inMemoryStore: ProjectMasksStore | null = null;
let writeQueue: Promise<void> = Promise.resolve();

async function loadStore(): Promise<ProjectMasksStore> {
  if (inMemoryStore) return inMemoryStore;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(MASKS_FILE)) {
    inMemoryStore = {};
    fs.writeFileSync(MASKS_FILE, JSON.stringify({}, null, 2), 'utf-8');
    return inMemoryStore;
  }

  try {
    const raw = fs.readFileSync(MASKS_FILE, 'utf-8');
    inMemoryStore = JSON.parse(raw);
    return inMemoryStore!;
  } catch (err) {
    console.error('Error reading project_masks.json, resetting empty store:', err);
    inMemoryStore = {};
    return inMemoryStore;
  }
}

async function persistStore(): Promise<void> {
  if (!inMemoryStore) return;
  const snapshot = JSON.stringify(inMemoryStore, null, 2);
  const tempFile = `${MASKS_FILE}.${Date.now()}.tmp`;

  writeQueue = writeQueue.then(async () => {
    try {
      await fs.promises.writeFile(tempFile, snapshot, 'utf-8');
      await fs.promises.rename(tempFile, MASKS_FILE);
    } catch (err) {
      console.error('Failed persisting project masks:', err);
      try {
        if (fs.existsSync(tempFile)) await fs.promises.unlink(tempFile);
      } catch {}
    }
  });

  await writeQueue;
}

/**
 * Validates the geometric bounds of a mask.
 */
export function validateMaskBounds(mask: Partial<MaskRegion>): { valid: boolean; error?: string } {
  if (!mask.name || typeof mask.name !== 'string') {
    return { valid: false, error: 'Mask name is required.' };
  }
  if (typeof mask.x !== 'number' || typeof mask.y !== 'number' || mask.x < 0 || mask.y < 0) {
    return { valid: false, error: 'Mask x and y coordinates must be non-negative numbers.' };
  }
  if (typeof mask.width !== 'number' || typeof mask.height !== 'number' || mask.width <= 0 || mask.height <= 0) {
    return { valid: false, error: 'Mask width and height must be positive numbers.' };
  }
  if (mask.unit === 'percent' && (mask.x + mask.width > 100 || mask.y + mask.height > 100)) {
    return { valid: false, error: 'Percentage mask bounds exceed 100% of the viewport.' };
  }
  return { valid: true };
}

/**
 * Retrieves all saved dynamic exclusion masks for a given project, optionally filtered by route.
 */
export async function getProjectMasks(
  projectId: string,
  route?: string
): Promise<MaskRegion[]> {
  const store = await loadStore();
  const list = store[projectId] || [];

  if (!route) return list;

  return list.filter((m) => !m.route || m.route === '*' || m.route === route);
}

/**
 * Saves or updates the complete array of masks for a project configuration.
 */
export async function saveProjectMasks(
  projectId: string,
  masks: MaskRegion[]
): Promise<MaskRegion[]> {
  for (const m of masks) {
    const check = validateMaskBounds(m);
    if (!check.valid) {
      throw new Error(`Invalid mask "${m.name}": ${check.error}`);
    }
  }

  const store = await loadStore();
  store[projectId] = masks;
  await persistStore();
  return masks;
}

/**
 * Adds a new dynamic region mask to a project's comparison configuration.
 */
export async function addProjectMask(
  projectId: string,
  maskInput: Omit<MaskRegion, 'id'>
): Promise<MaskRegion> {
  const check = validateMaskBounds(maskInput);
  if (!check.valid) {
    throw new Error(`Invalid mask: ${check.error}`);
  }

  const store = await loadStore();
  const list = store[projectId] || [];

  const newMask: MaskRegion = {
    ...maskInput,
    id: `mask_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
  };

  list.push(newMask);
  store[projectId] = list;
  await persistStore();

  return newMask;
}

/**
 * Removes a mask by ID from a project configuration.
 */
export async function deleteProjectMask(
  projectId: string,
  maskId: string
): Promise<boolean> {
  const store = await loadStore();
  const list = store[projectId] || [];
  const initialLen = list.length;
  const filtered = list.filter((m) => m.id !== maskId);

  if (filtered.length !== initialLen) {
    store[projectId] = filtered;
    await persistStore();
    return true;
  }
  return false;
}

/**
 * Resets masks store (used for test isolation).
 */
export async function clearMasksStore(): Promise<void> {
  inMemoryStore = {};
  if (fs.existsSync(MASKS_FILE)) {
    await fs.promises.unlink(MASKS_FILE).catch(() => {});
  }
}
