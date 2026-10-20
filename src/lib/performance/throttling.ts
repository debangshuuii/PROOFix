import type {
  NetworkThrottlingPreset,
  ThrottlingProfile,
} from '../types/performance.ts';

export const THROTTLING_PRESETS: Record<NetworkThrottlingPreset, ThrottlingProfile> = {
  none: {
    name: 'none',
    offline: false,
    downloadThroughput: -1, // No limit
    uploadThroughput: -1,   // No limit
    latencyMs: 0,
    cpuThrottlingRate: 1,   // No slowdown
  },
  'fast-3g': {
    name: 'fast-3g',
    offline: false,
    downloadThroughput: (1.6 * 1024 * 1024) / 8, // 1.6 Mbps = 200 KB/s
    uploadThroughput: (750 * 1024) / 8,          // 750 Kbps = 93.75 KB/s
    latencyMs: 150,                              // 150ms round-trip latency
    cpuThrottlingRate: 1,
  },
  'slow-3g': {
    name: 'slow-3g',
    offline: false,
    downloadThroughput: (500 * 1024) / 8, // 500 Kbps = 62.5 KB/s
    uploadThroughput: (500 * 1024) / 8,   // 500 Kbps = 62.5 KB/s
    latencyMs: 400,                       // 400ms latency
    cpuThrottlingRate: 4,                 // 4x CPU slowdown
  },
  offline: {
    name: 'offline',
    offline: true,
    downloadThroughput: 0,
    uploadThroughput: 0,
    latencyMs: 0,
    cpuThrottlingRate: 1,
  },
  custom: {
    name: 'custom',
    offline: false,
    downloadThroughput: 1024 * 1024,
    uploadThroughput: 512 * 1024,
    latencyMs: 100,
    cpuThrottlingRate: 2,
  },
};

export interface ActiveThrottlingSession {
  cdpSession?: any;
  preset: NetworkThrottlingPreset;
  appliedAt: string;
}

const activeSessions = new WeakMap<any, ActiveThrottlingSession>();

/**
 * Applies network bandwidth and CPU throttling to an active Playwright page or context via Chrome DevTools Protocol.
 */
export async function applyThrottling(
  page: any,
  preset: NetworkThrottlingPreset = 'none'
): Promise<ThrottlingProfile> {
  const profile = THROTTLING_PRESETS[preset] || THROTTLING_PRESETS.none;

  if (preset === 'none') {
    await resetThrottling(page);
    return profile;
  }

  try {
    let cdpSession: any = null;
    if (page.context && typeof page.context().newCDPSession === 'function') {
      cdpSession = await page.context().newCDPSession(page);
    } else if (typeof page.newCDPSession === 'function') {
      cdpSession = await page.newCDPSession();
    }

    if (cdpSession) {
      // 1. Emulate Network Conditions
      await cdpSession.send('Network.enable');
      await cdpSession.send('Network.emulateNetworkConditions', {
        offline: profile.offline,
        latency: profile.latencyMs,
        downloadThroughput: profile.downloadThroughput,
        uploadThroughput: profile.uploadThroughput,
      });

      // 2. Emulate CPU Throttling Rate
      if (profile.cpuThrottlingRate > 1) {
        await cdpSession.send('Emulation.setCPUThrottlingRate', {
          rate: profile.cpuThrottlingRate,
        });
      }

      activeSessions.set(page, {
        cdpSession,
        preset,
        appliedAt: new Date().toISOString(),
      });
    }
  } catch {
    // If browser doesn't support CDP (e.g. Firefox or mock), record state without failing
    activeSessions.set(page, {
      preset,
      appliedAt: new Date().toISOString(),
    });
  }

  return profile;
}

/**
 * Resets network and CPU throttling to normal full speed, ensuring no throttling leaks.
 */
export async function resetThrottling(page: any): Promise<void> {
  const active = activeSessions.get(page);
  if (!active) {
    return;
  }

  if (active.cdpSession) {
    try {
      await active.cdpSession.send('Network.emulateNetworkConditions', {
        offline: false,
        latency: 0,
        downloadThroughput: -1,
        uploadThroughput: -1,
      });

      await active.cdpSession.send('Emulation.setCPUThrottlingRate', {
        rate: 1,
      });

      await active.cdpSession.detach().catch(() => {});
    } catch {
      // Ignore cleanup error if page already closed
    }
  }

  activeSessions.delete(page);
}

/**
 * Checks if a page currently has throttling active.
 */
export function getActiveThrottling(page: any): NetworkThrottlingPreset {
  const active = activeSessions.get(page);
  return active ? active.preset : 'none';
}
