/**
 * PROOFix CLI: `proofix status` Command Handler
 * Probes local HTTP ports for running PROOFix verification engine instances.
 */

import http from 'http';
import { printBanner } from '../banner.ts';
import { colors, symbols, badge } from '../colors.ts';

export interface EngineStatusResult {
  active: boolean;
  port?: number;
  version?: string;
  tagline?: string;
  capabilities?: string[];
  latencyMs?: number;
}

export async function probePort(port: number, timeoutMs = 2000): Promise<EngineStatusResult | null> {
  const start = Date.now();
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/api/v1/health`, { timeout: timeoutMs }, (res) => {
      let data = '';
      res.on('data', (d) => (data += d));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({
            active: true,
            port,
            version: json.version || '0.1.0',
            tagline: json.tagline,
            capabilities: json.capabilities,
            latencyMs: Date.now() - start,
          });
        } catch {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
  });
}

export async function executeStatusCommand(targetPort?: number, json = false): Promise<EngineStatusResult> {
  const portsToTest = targetPort ? [targetPort] : [3000, 3001, 8080];

  if (!json) {
    printBanner('Engine Service Status');
    console.log(`  ${colors.blue(symbols.info)} Probing local ports (${portsToTest.join(', ')})...\n`);
  }

  for (const port of portsToTest) {
    const status = await probePort(port);
    if (status) {
      if (json) {
        console.log(JSON.stringify(status, null, 2));
        return status;
      }

      console.log(`  ${badge('ENGINE ONLINE', 'green')} Port ${colors.bold(String(port))}`);
      console.log(`  ${colors.green(symbols.tick)} Latency:      ${colors.cyan(`${status.latencyMs}ms`)}`);
      console.log(`  ${colors.green(symbols.tick)} Version:      ${status.version}`);
      if (status.tagline) {
        console.log(`  ${colors.green(symbols.tick)} Tagline:      ${colors.gray(`"${status.tagline}"`)}`);
      }
      console.log(`\n  Dashboard available at: ${colors.bold(colors.cyan(`http://localhost:${port}/dashboard`))}\n`);
      return status;
    }
  }

  const offlineResult: EngineStatusResult = { active: false };
  if (json) {
    console.log(JSON.stringify(offlineResult, null, 2));
    return offlineResult;
  }

  console.log(`  ${badge('ENGINE OFFLINE', 'yellow')}`);
  console.log(`  ${colors.yellow(symbols.warn)} No active PROOFix server detected on ports 3000, 3001, or 8080.`);
  console.log(`  Start the local engine server with: ${colors.bold(colors.green('npm run dev'))}\n`);
  return offlineResult;
}
