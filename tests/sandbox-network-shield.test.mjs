import assert from 'node:assert/strict';
import { NetworkShield } from '../src/lib/sandbox/network-shield.ts';

console.log('--- Testing Network Egress Firewall & Metadata Shield (Contribution 153) ---');

const shield = new NetworkShield();
const sandboxId = 'sbx-net-test-001';

// 1. Cloud Metadata Block Test
const metadataPolicy = {
  allowEgress: true,
  blockCloudMetadata: true,
  allowedDomains: [],
  allowedPorts: [80, 443],
  isolatedBridgeNetwork: true,
};

const awsCheck = shield.evaluateDestination(sandboxId, 'http://169.254.169.254/latest/meta-data/', metadataPolicy);
assert.equal(awsCheck.allowed, false);
assert.equal(awsCheck.reason, 'cloud_metadata_blocked');

const gcpCheck = shield.evaluateDestination(sandboxId, 'http://metadata.google.internal/computeMetadata/v1/', metadataPolicy);
assert.equal(gcpCheck.allowed, false);
assert.equal(gcpCheck.reason, 'cloud_metadata_blocked');

const azureCheck = shield.evaluateDestination(sandboxId, '168.63.129.16', metadataPolicy);
assert.equal(azureCheck.allowed, false);
assert.equal(azureCheck.reason, 'cloud_metadata_blocked');
console.log('✅ Cloud metadata shield blocks AWS, GCP, and Azure IMDS endpoints');

// 2. Egress Disabled Test
const noEgressPolicy = {
  allowEgress: false,
  blockCloudMetadata: true,
  allowedDomains: [],
  allowedPorts: [],
  isolatedBridgeNetwork: true,
};

const noEgressCheck = shield.evaluateDestination(sandboxId, 'https://github.com', noEgressPolicy);
assert.equal(noEgressCheck.allowed, false);
assert.equal(noEgressCheck.reason, 'egress_disabled');
console.log('✅ Total egress block enforced when allowEgress is false');

// 3. RFC 1918 Private Subnet Block Test
const privateIpCheck = shield.evaluateDestination(sandboxId, 'http://10.0.1.50:8080/admin', metadataPolicy);
assert.equal(privateIpCheck.allowed, false);
assert.equal(privateIpCheck.reason, 'private_subnet_blocked');

const homeRouterCheck = shield.evaluateDestination(sandboxId, '192.168.1.1', metadataPolicy);
assert.equal(homeRouterCheck.allowed, false);
assert.equal(homeRouterCheck.reason, 'private_subnet_blocked');
console.log('✅ Private RFC 1918 subnets blocked from sandbox exfiltration');

// 4. Domain Whitelist & Allowed Ports Test
const whitelistedPolicy = {
  allowEgress: true,
  blockCloudMetadata: true,
  allowedDomains: ['npmjs.org', 'github.com'],
  allowedPorts: [443],
  isolatedBridgeNetwork: true,
};

const goodDomainCheck = shield.evaluateDestination(sandboxId, 'https://registry.npmjs.org/express', whitelistedPolicy);
assert.equal(goodDomainCheck.allowed, true);

const badDomainCheck = shield.evaluateDestination(sandboxId, 'https://c2-malicious-server.xyz', whitelistedPolicy);
assert.equal(badDomainCheck.allowed, false);
assert.equal(badDomainCheck.reason, 'domain_not_whitelisted');

const badPortCheck = shield.evaluateDestination(sandboxId, 'https://github.com:22', whitelistedPolicy, 22);
assert.equal(badPortCheck.allowed, false);
assert.equal(badPortCheck.reason, 'port_not_allowed');
console.log('✅ Whitelisted domains & ports enforced correctly');

// 5. Iptables rules generation
const rules = shield.generateIptablesRules(sandboxId, whitelistedPolicy);
assert.ok(rules.some((r) => r.includes('169.254.169.254')), 'Iptables must contain metadata drop rule');
assert.ok(rules.some((r) => r.includes('10.0.0.0/8')), 'Iptables must drop 10.0.0.0/8');
assert.ok(rules.some((r) => r.includes('--dports 443')), 'Iptables must allow port 443');
console.log('✅ Iptables netfilter rules synthesized correctly');

// 6. Security Event Auditing
const violations = shield.getBlockedEvents(sandboxId);
assert.ok(violations.length >= 5, 'Must record all blocked access violations');
assert.equal(violations[0].reason, 'cloud_metadata_blocked');
console.log('✅ Violation audit logging verified');

console.log('✅ Contribution 153 tests passed cleanly!');
