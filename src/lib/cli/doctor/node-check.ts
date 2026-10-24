/**
 * PROOFix CLI Doctor: Node.js Version Check
 * Validates that host runtime satisfies Node.js >= 20.0.0 constraint.
 */

import type { DoctorCheckResult } from '../types.ts';

export function checkNodeVersion(mockVersion?: string): DoctorCheckResult {
  const versionStr = mockVersion ?? process.version;
  const match = versionStr.match(/^v?(\d+)\.(\d+)\.(\d+)/);

  if (!match) {
    return {
      id: 'node_version',
      name: 'Node.js Runtime Version',
      category: 'runtime',
      status: 'failed',
      message: `Unable to parse Node.js version string: ${versionStr}`,
      recommendation: 'Ensure standard Node.js distribution is installed.',
      details: { rawVersion: versionStr },
    };
  }

  const major = parseInt(match[1], 10);
  const minor = parseInt(match[2], 10);
  const patch = parseInt(match[3], 10);

  if (major < 20) {
    return {
      id: 'node_version',
      name: 'Node.js Runtime Version',
      category: 'runtime',
      status: 'failed',
      message: `Node.js ${versionStr} is unsupported. PROOFix requires Node.js >= 20.0.0.`,
      recommendation: 'Upgrade to Node.js LTS (v20 or v22) from https://nodejs.org or run nvm use 20.',
      details: { current: versionStr, required: '>= 20.0.0' },
    };
  }

  return {
    id: 'node_version',
    name: 'Node.js Runtime Version',
    category: 'runtime',
    status: 'passed',
    message: `Node.js ${versionStr} (meets requirement >= 20.0.0)`,
    details: { current: versionStr, major, minor, patch, required: '>= 20.0.0' },
  };
}
