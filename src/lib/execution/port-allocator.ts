/**
 * Resilient Port Allocator & Port Collision Detection Engine
 * Uses non-blocking TCP socket binding to safely allocate, probe, and
 * reassign collision-free dynamic ports for sandboxed execution runs.
 */

import net from 'net';
import type { PortAllocationResult } from '../types/execution.ts';

export const DEFAULT_PORT_RANGE = {
  min: 4173,
  max: 4999,
};

/**
 * Checks whether a given port is currently open and bound by another process.
 */
export function isPortInUse(port: number, host: string = '127.0.0.1'): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', (err: any) => {
      if (err.code === 'EADDRINUSE' || err.code === 'EACCES') {
        resolve(true); // Port is occupied or restricted
      } else {
        resolve(true);
      }
    });

    server.once('listening', () => {
      server.close(() => resolve(false)); // Port is free!
    });

    server.listen(port, host);
  });
}

/**
 * Finds an available port starting from preferredPort within the search range.
 */
export async function allocatePort(
  preferredPort: number = DEFAULT_PORT_RANGE.min,
  maxSearchAttempts: number = 50,
  host: string = '127.0.0.1'
): Promise<PortAllocationResult> {
  const attemptedPorts: number[] = [];
  let candidate = preferredPort;

  for (let i = 0; i < maxSearchAttempts; i++) {
    attemptedPorts.push(candidate);
    const inUse = await isPortInUse(candidate, host);

    if (!inUse) {
      return {
        allocatedPort: candidate,
        wasCollision: candidate !== preferredPort,
        attemptedPorts,
        reassigned: candidate !== preferredPort,
      };
    }

    // Step to next candidate port
    candidate++;
    if (candidate > DEFAULT_PORT_RANGE.max) {
      candidate = DEFAULT_PORT_RANGE.min;
    }
  }

  // Fallback: let OS assign an ephemeral port
  const ephemeralPort = await new Promise<number>((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, host, () => {
      const address = srv.address() as net.AddressInfo;
      const port = address.port;
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });

  return {
    allocatedPort: ephemeralPort,
    wasCollision: true,
    attemptedPorts,
    reassigned: true,
  };
}
