/**
 * Adversarial & Security Mutation Engine (Contribution 134)
 */

import type {
  EndpointContract,
  FuzzPayload,
  FuzzStrategyType,
} from '../types/api-fuzzing.ts';

export const NULL_BYTE_PAYLOADS = [
  { val: 'admin\u0000.png', desc: 'Trailing null byte extension bypass' },
  { val: 'test\u0000payload', desc: 'Embedded UTF-8 null byte (\\u0000)' },
  { val: '%00', desc: 'URL-encoded null byte (%00)' },
  { val: '\\0', desc: 'Escaped null byte string' },
];

export const UNICODE_HOMOGLYPH_PAYLOADS = [
  { val: 'аdmіn', desc: 'Cyrillic homoglyph spoofing "admin"' }, // 'а' U+0430, 'і' U+0456
  { val: 'user\u202Etxt.exe', desc: 'Right-to-Left Override (RLO) bi-directional text spoofing' },
  { val: 'zero\u200Bwidth\u200Bspace', desc: 'Zero-width space injection (U+200B)' },
  { val: '🔥💯🚀💻🛡️', desc: 'High surrogate 4-byte UTF-8 emoji sequence' },
  { val: '\uFEFFBOM_prefix', desc: 'Byte Order Mark (BOM) prefix injection' },
];

export const SQLI_PROBE_PAYLOADS = [
  { val: "' OR '1'='1", desc: 'Classic SQL single-quote tautology injection' },
  { val: '" OR "1"="1', desc: 'Double-quote SQL tautology probe' },
  { val: "1' UNION SELECT NULL, NULL--", desc: 'UNION-based SQL schema probe' },
  { val: "1; SELECT pg_sleep(0.01)--", desc: 'PostgreSQL sleep injection probe' },
  { val: "admin' --", desc: 'Comment-out password check SQL probe' },
  { val: "1' AND 1=(SELECT COUNT(*) FROM tablename); --", desc: 'Blind SQL error-based probe' },
];

export const XSS_PROBE_PAYLOADS = [
  { val: '<script>alert(1)</script>', desc: 'Canonical script tag injection' },
  { val: '<img src=x onerror=alert(1)>', desc: 'Image onerror inline event handler' },
  { val: '"><svg/onload=alert(1)>', desc: 'HTML attribute breakout with SVG onload' },
  { val: "javascript:/*--></title></style></textarea></script></xmp><svg/onload='+/\"/+/onmouseover=1/+/[*/[]/+alert(1)//'>", desc: 'Polyglot XSS vector' },
  { val: '<iframe src="javascript:alert(1)">', desc: 'Iframe javascript URI injection' },
];

export const OVERSIZED_PAYLOADS = [
  { val: 'A'.repeat(64 * 1024), desc: '64KB payload buffer limit test' },
  { val: 'B'.repeat(256 * 1024), desc: '256KB medium request limit probe' },
  { val: 'C'.repeat(1024 * 1024), desc: '1MB max request body limit boundary' },
];

export const AUTH_TAMPERING_PAYLOADS: { headers: Record<string, string>; desc: string }[] = [
  {
    headers: { Authorization: 'Bearer invalid.jwt.signature_tampered' },
    desc: 'Malformed JWT signature token',
  },
  {
    headers: { Authorization: 'Bearer null' },
    desc: 'Null bearer token',
  },
  {
    headers: { Authorization: 'Bearer ' },
    desc: 'Empty bearer token',
  },
  {
    headers: { Authorization: 'Basic Og==' },
    desc: 'Empty basic auth credentials (:)',
  },
  {
    headers: { 'X-Forwarded-For': '127.0.0.1, 10.0.0.1' },
    desc: 'IP spoofing localhost via X-Forwarded-For',
  },
];

/**
 * Generates adversarial and security probe payloads for a target endpoint.
 */
export function generateAdversarialPayloads(
  endpoint: EndpointContract,
  enabledStrategies: FuzzStrategyType[] = [
    'null_byte_injection',
    'unicode_homoglyphs',
    'sqli_adversarial',
    'xss_adversarial',
    'oversized_payload',
    'auth_tampering',
  ]
): FuzzPayload[] {
  const result: FuzzPayload[] = [];
  let seq = 0;

  // 1. Target string parameters
  for (const param of endpoint.parameters) {
    if (param.type !== 'string') continue;

    if (enabledStrategies.includes('null_byte_injection')) {
      for (const item of NULL_BYTE_PAYLOADS) {
        result.push({
          id: `adv_null_${seq++}`,
          strategy: 'null_byte_injection',
          endpointId: endpoint.id,
          targetParameter: param.name,
          value: item.val,
          description: `${item.desc} on parameter "${param.name}"`,
        });
      }
    }

    if (enabledStrategies.includes('unicode_homoglyphs')) {
      for (const item of UNICODE_HOMOGLYPH_PAYLOADS) {
        result.push({
          id: `adv_uni_${seq++}`,
          strategy: 'unicode_homoglyphs',
          endpointId: endpoint.id,
          targetParameter: param.name,
          value: item.val,
          description: `${item.desc} on parameter "${param.name}"`,
        });
      }
    }

    if (enabledStrategies.includes('sqli_adversarial')) {
      for (const item of SQLI_PROBE_PAYLOADS) {
        result.push({
          id: `adv_sqli_${seq++}`,
          strategy: 'sqli_adversarial',
          endpointId: endpoint.id,
          targetParameter: param.name,
          value: item.val,
          description: `${item.desc} on parameter "${param.name}"`,
        });
      }
    }

    if (enabledStrategies.includes('xss_adversarial')) {
      for (const item of XSS_PROBE_PAYLOADS) {
        result.push({
          id: `adv_xss_${seq++}`,
          strategy: 'xss_adversarial',
          endpointId: endpoint.id,
          targetParameter: param.name,
          value: item.val,
          description: `${item.desc} on parameter "${param.name}"`,
        });
      }
    }
  }

  // 2. Target JSON Request Body String Fields
  const reqBody = endpoint.requestBody;
  if (reqBody && reqBody.schema && reqBody.schema.properties) {
    for (const [fieldName, propDef] of Object.entries(reqBody.schema.properties)) {
      if (propDef.type !== 'string') continue;

      if (enabledStrategies.includes('null_byte_injection')) {
        for (const item of NULL_BYTE_PAYLOADS) {
          result.push({
            id: `adv_body_null_${seq++}`,
            strategy: 'null_byte_injection',
            endpointId: endpoint.id,
            targetField: fieldName,
            value: item.val,
            description: `${item.desc} on field "${fieldName}"`,
          });
        }
      }

      if (enabledStrategies.includes('sqli_adversarial')) {
        for (const item of SQLI_PROBE_PAYLOADS) {
          result.push({
            id: `adv_body_sqli_${seq++}`,
            strategy: 'sqli_adversarial',
            endpointId: endpoint.id,
            targetField: fieldName,
            value: item.val,
            description: `${item.desc} on field "${fieldName}"`,
          });
        }
      }

      if (enabledStrategies.includes('xss_adversarial')) {
        for (const item of XSS_PROBE_PAYLOADS) {
          result.push({
            id: `adv_body_xss_${seq++}`,
            strategy: 'xss_adversarial',
            endpointId: endpoint.id,
            targetField: fieldName,
            value: item.val,
            description: `${item.desc} on field "${fieldName}"`,
          });
        }
      }

      if (enabledStrategies.includes('oversized_payload')) {
        for (const item of OVERSIZED_PAYLOADS) {
          result.push({
            id: `adv_body_over_${seq++}`,
            strategy: 'oversized_payload',
            endpointId: endpoint.id,
            targetField: fieldName,
            value: item.val,
            description: `${item.desc} on field "${fieldName}"`,
          });
        }
      }
    }
  }

  // 3. Auth Tampering Strategy (Headers)
  if (enabledStrategies.includes('auth_tampering')) {
    for (const item of AUTH_TAMPERING_PAYLOADS) {
      result.push({
        id: `adv_auth_${seq++}`,
        strategy: 'auth_tampering',
        endpointId: endpoint.id,
        value: null,
        headers: item.headers,
        description: item.desc,
      });
    }
  }

  return result;
}
