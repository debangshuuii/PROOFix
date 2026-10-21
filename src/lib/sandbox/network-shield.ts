/**
 * Network Egress Firewall & Cloud Metadata Shield (Contribution 153)
 *
 * Implements egress filtering, SSRF protection against cloud metadata services
 * (AWS 169.254.169.254, Azure 168.63.129.16, Alibaba 100.100.100.200), RFC 1918 private network
 * blocking, and iptables/nftables firewall rule generation for sandbox namespaces.
 */

import type { NetworkShieldPolicy } from '../types/sandbox-isolation.ts';

export interface BlockedAttemptEvent {
  sandboxId: string;
  target: string;
  protocol?: string;
  port?: number;
  reason: 'cloud_metadata_blocked' | 'egress_disabled' | 'private_subnet_blocked' | 'domain_not_whitelisted' | 'port_not_allowed';
  timestamp: string;
}

export const CLOUD_METADATA_IPS = new Set([
  '169.254.169.254',  // AWS EC2, GCP metadata, OpenStack
  '169.254.169.250',
  '169.254.169.251',
  '169.254.169.252',
  '169.254.169.253',
  '168.63.129.16',    // Azure IMDS & wireserver
  '100.100.100.200',  // Alibaba Cloud metadata
  'fd00:ec2::254',    // AWS IPv6 metadata
]);

export const CLOUD_METADATA_HOSTNAMES = new Set([
  'metadata.google.internal',
  'instance-data',
  'metadata.local',
]);

export const RFC1918_PRIVATE_CIDRS = [
  /^127\./,           // Loopback (when crossing container namespace boundary)
  /^10\./,            // Class A private
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Class B private
  /^192\.168\./,      // Class C private
  /^169\.254\./,      // Link-local
];

export class NetworkShield {
  private blockedEvents: BlockedAttemptEvent[] = [];

  /**
   * Evaluates if a given URL, hostname, or IP address is permitted under the policy.
   */
  public evaluateDestination(
    sandboxId: string,
    target: string,
    policy: NetworkShieldPolicy,
    targetPort: number = 443
  ): { allowed: boolean; reason?: BlockedAttemptEvent['reason'] } {
    let hostname = target;

    try {
      if (target.includes('://')) {
        const parsed = new URL(target);
        hostname = parsed.hostname;
        if (parsed.port) {
          targetPort = parseInt(parsed.port, 10);
        } else {
          targetPort = parsed.protocol === 'http:' ? 80 : 443;
        }
      }
    } catch {
      // Treat target directly as hostname or IP
      hostname = target.split(':')[0];
    }

    // 1. Cloud Metadata Shield (Always checked first if policy.blockCloudMetadata is true)
    if (policy.blockCloudMetadata) {
      if (CLOUD_METADATA_IPS.has(hostname) || CLOUD_METADATA_HOSTNAMES.has(hostname.toLowerCase())) {
        this.recordViolation(sandboxId, target, 'cloud_metadata_blocked', targetPort);
        return { allowed: false, reason: 'cloud_metadata_blocked' };
      }
    }

    // 2. Global Egress Disable Check
    if (!policy.allowEgress) {
      this.recordViolation(sandboxId, target, 'egress_disabled', targetPort);
      return { allowed: false, reason: 'egress_disabled' };
    }

    // 3. RFC 1918 Private Subnet Block (unless explicitly allowlisted)
    const isPrivateIp = RFC1918_PRIVATE_CIDRS.some((regex) => regex.test(hostname));
    if (isPrivateIp) {
      const isExplicitlyAllowed = policy.allowedDomains?.includes(hostname);
      if (!isExplicitlyAllowed) {
        this.recordViolation(sandboxId, target, 'private_subnet_blocked', targetPort);
        return { allowed: false, reason: 'private_subnet_blocked' };
      }
    }

    // 4. Whitelisted Domains Check
    if (policy.allowedDomains && policy.allowedDomains.length > 0) {
      const lowerHost = hostname.toLowerCase();
      const domainAllowed = policy.allowedDomains.some((d) => {
        const lowerDomain = d.toLowerCase();
        return lowerHost === lowerDomain || lowerHost.endsWith(`.${lowerDomain}`);
      });

      if (!domainAllowed) {
        this.recordViolation(sandboxId, target, 'domain_not_whitelisted', targetPort);
        return { allowed: false, reason: 'domain_not_whitelisted' };
      }
    }

    // 5. Port Allowlist Check
    if (policy.allowedPorts && policy.allowedPorts.length > 0) {
      if (!policy.allowedPorts.includes(targetPort)) {
        this.recordViolation(sandboxId, target, 'port_not_allowed', targetPort);
        return { allowed: false, reason: 'port_not_allowed' };
      }
    }

    return { allowed: true };
  }

  /**
   * Generates Linux iptables / nftables firewall rules for network isolation in netns.
   */
  public generateIptablesRules(sandboxId: string, policy: NetworkShieldPolicy): string[] {
    const rules: string[] = [
      `# PROOFix Sandbox Network Shield Rules for [${sandboxId}]`,
      '*filter',
      ':INPUT DROP [0:0]',
      ':FORWARD DROP [0:0]',
      ':OUTPUT ACCEPT [0:0]',
      // Allow loopback internal traffic
      '-A INPUT -i lo -j ACCEPT',
      '-A OUTPUT -o lo -j ACCEPT',
      // Allow established connections
      '-A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT',
    ];

    if (!policy.allowEgress) {
      rules.push('-A OUTPUT -j DROP');
      rules.push('COMMIT');
      return rules;
    }

    if (policy.blockCloudMetadata) {
      for (const ip of CLOUD_METADATA_IPS) {
        if (!ip.includes(':')) {
          rules.push(`-A OUTPUT -d ${ip} -j REJECT --reject-with icmp-host-prohibited`);
        }
      }
    }

    // Block private subnets
    rules.push('-A OUTPUT -d 10.0.0.0/8 -j REJECT');
    rules.push('-A OUTPUT -d 172.16.0.0/12 -j REJECT');
    rules.push('-A OUTPUT -d 192.168.0.0/16 -j REJECT');

    // Restrict ports if specified
    if (policy.allowedPorts && policy.allowedPorts.length > 0) {
      const portList = policy.allowedPorts.join(',');
      rules.push(`-A OUTPUT -p tcp -m multiport --dports ${portList} -j ACCEPT`);
      rules.push('-A OUTPUT -p udp --dport 53 -j ACCEPT'); // DNS resolution
      rules.push('-A OUTPUT -j DROP');
    }

    rules.push('COMMIT');
    return rules;
  }

  private recordViolation(
    sandboxId: string,
    target: string,
    reason: BlockedAttemptEvent['reason'],
    port?: number
  ): void {
    this.blockedEvents.push({
      sandboxId,
      target,
      port,
      reason,
      timestamp: new Date().toISOString(),
    });
  }

  public getBlockedEvents(sandboxId?: string): BlockedAttemptEvent[] {
    if (!sandboxId) return [...this.blockedEvents];
    return this.blockedEvents.filter((ev) => ev.sandboxId === sandboxId);
  }

  public clearBlockedEvents(): void {
    this.blockedEvents = [];
  }
}
