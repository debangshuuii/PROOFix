/**
 * PROOFix CLI Doctor: Ephemeral Port Allocation Check
 * Validates TCP socket binding and ephemeral port allocation permissions on loopback interface.
 */

import net from 'net';
import type { DoctorCheckResult } from '../types.ts';

export async function checkEphemeralPortAllocation(mockError?: string): Promise<DoctorCheckResult> {
  if (mockError) {
    return {
      id: 'ephemeral_ports',
      name: 'Ephemeral Port Allocation',
      category: 'network',
      status: 'failed',
      message: `Failed to allocate ephemeral port: ${mockError}`,
      recommendation: 'Verify local firewall or container network policies permit loopback TCP sockets.',
      details: { error: mockError },
    };
  }

  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', (err: NodeJS.ErrnoException) => {
      resolve({
        id: 'ephemeral_ports',
        name: 'Ephemeral Port Allocation',
        category: 'network',
        status: 'failed',
        message: `Socket bind error: ${err.message} (${err.code || 'UNKNOWN'})`,
        recommendation: 'Check that loopback (127.0.0.1) permissions are not blocked by security software.',
        details: { code: err.code, message: err.message },
      });
    });

    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const allocatedPort = typeof address === 'object' && address ? address.port : null;

      server.close((closeErr) => {
        if (closeErr) {
          resolve({
            id: 'ephemeral_ports',
            name: 'Ephemeral Port Allocation',
            category: 'network',
            status: 'warning',
            message: `Port allocated (${allocatedPort}) but failed to close cleanly: ${closeErr.message}`,
            details: { port: allocatedPort, error: closeErr.message },
          });
          return;
        }

        resolve({
          id: 'ephemeral_ports',
          name: 'Ephemeral Port Allocation',
          category: 'network',
          status: 'passed',
          message: `Ephemeral TCP binding verified on loopback (allocated port ${allocatedPort})`,
          details: { allocatedPort, host: '127.0.0.1' },
        });
      });
    });
  });
}
