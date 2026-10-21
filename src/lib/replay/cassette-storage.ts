/**
 * Cassette Storage & File Format Engine (Contribution 143)
 */

import fs from 'fs';
import path from 'path';
import type {
  TrafficCassette,
  CassetteInteraction,
} from '../types/mock-replay.ts';

export const DEFAULT_CASSETTE_DIR = path.join(process.cwd(), '.proofix', 'cassettes');

/**
 * Ensures cassette storage directory exists.
 */
export function ensureCassetteDir(dir: string = DEFAULT_CASSETTE_DIR): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Normalizes cassette filename to valid safe identifier.
 */
export function getCassetteFilePath(nameOrId: string, dir: string = DEFAULT_CASSETTE_DIR): string {
  const cleanName = nameOrId.replace(/[^a-zA-Z0-9_\-]/g, '_');
  const filename = cleanName.endsWith('.json') ? cleanName : `${cleanName}.json`;
  return path.join(dir, filename);
}

/**
 * Infers provider from URL (e.g. stripe.com -> stripe, github.com -> github).
 */
export function inferProvider(url: string): string {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes('stripe')) return 'stripe';
    if (host.includes('github')) return 'github';
    if (host.includes('openai')) return 'openai';
    if (host.includes('twilio')) return 'twilio';
    if (host.includes('auth0')) return 'auth0';
    if (host.includes('google') || host.includes('googleapis')) return 'google';
    if (host.includes('aws') || host.includes('amazonaws')) return 'aws';
    return host;
  } catch {
    return 'custom';
  }
}

/**
 * Saves a TrafficCassette object to disk.
 */
export async function saveCassette(
  cassette: TrafficCassette,
  dir: string = DEFAULT_CASSETTE_DIR
): Promise<string> {
  ensureCassetteDir(dir);

  // Re-calculate metadata
  const providersSet = new Set<string>();
  for (const int of cassette.interactions) {
    if (int.provider) providersSet.add(int.provider);
    else if (int.request?.url) {
      const p = inferProvider(int.request.url);
      int.provider = p;
      providersSet.add(p);
    }
  }

  cassette.updatedAt = new Date().toISOString();
  cassette.metadata = {
    recordedBy: cassette.metadata?.recordedBy || 'PROOFix Deterministic Replay Engine',
    totalInteractions: cassette.interactions.length,
    providers: Array.from(providersSet),
    scrubbedSecretsCount: cassette.metadata?.scrubbedSecretsCount || 0,
  };

  const filePath = getCassetteFilePath(cassette.name, dir);
  await fs.promises.writeFile(filePath, JSON.stringify(cassette, null, 2), 'utf8');
  return filePath;
}

/**
 * Loads a TrafficCassette from disk.
 */
export async function loadCassette(
  nameOrId: string,
  dir: string = DEFAULT_CASSETTE_DIR
): Promise<TrafficCassette | null> {
  const filePath = getCassetteFilePath(nameOrId, dir);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const raw = await fs.promises.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed as TrafficCassette;
  } catch {
    return null;
  }
}

/**
 * Lists all available cassettes in the storage directory.
 */
export async function listCassettes(
  dir: string = DEFAULT_CASSETTE_DIR
): Promise<TrafficCassette[]> {
  if (!fs.existsSync(dir)) return [];

  const files = await fs.promises.readdir(dir);
  const cassettes: TrafficCassette[] = [];

  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    try {
      const fullPath = path.join(dir, file);
      const content = await fs.promises.readFile(fullPath, 'utf8');
      const data = JSON.parse(content);
      if (data && data.interactions) {
        cassettes.push(data);
      }
    } catch {}
  }

  return cassettes;
}

/**
 * Appends a new interaction to an existing or new cassette.
 */
export async function recordInteraction(
  cassetteName: string,
  interaction: Omit<CassetteInteraction, 'id' | 'order' | 'createdAt'>,
  dir: string = DEFAULT_CASSETTE_DIR
): Promise<TrafficCassette> {
  let cassette = await loadCassette(cassetteName, dir);

  if (!cassette) {
    cassette = {
      id: `cas_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: cassetteName,
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      scope: 'global',
      interactions: [],
    };
  }

  const order = cassette.interactions.length + 1;
  const fullInteraction: CassetteInteraction = {
    ...interaction,
    id: `int_${order}_${Date.now()}`,
    order,
    provider: interaction.provider || inferProvider(interaction.request.url),
    timesReplayed: 0,
    createdAt: new Date().toISOString(),
  };

  cassette.interactions.push(fullInteraction);
  await saveCassette(cassette, dir);
  return cassette;
}

/**
 * Deletes a cassette file.
 */
export async function deleteCassette(
  nameOrId: string,
  dir: string = DEFAULT_CASSETTE_DIR
): Promise<boolean> {
  const filePath = getCassetteFilePath(nameOrId, dir);
  if (!fs.existsSync(filePath)) return false;

  await fs.promises.unlink(filePath);
  return true;
}
