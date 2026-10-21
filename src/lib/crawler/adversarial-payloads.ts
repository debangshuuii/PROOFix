/**
 * Adversarial Edge-Case Payload Generator (Contribution 222)
 *
 * Generates extreme boundary, multi-byte Unicode, XSS/SQLi probes,
 * prototype pollution payloads, and overflow strings for autonomous exploratory fuzzing.
 */

export interface AdversarialPayload {
  category: 'xss' | 'sqli' | 'unicode' | 'overflow' | 'numeric' | 'proto_pollution';
  value: string | number;
  description: string;
}

export const ADVERSARIAL_PAYLOAD_CATALOG: AdversarialPayload[] = [
  // 1. XSS / Script Injection Probes
  {
    category: 'xss',
    value: '<img src=x onerror=window.__proofix_xss_probe=true>',
    description: 'Image tag error event handler probe',
  },
  {
    category: 'xss',
    value: '"><svg/onload=window.__proofix_svg_probe=true>',
    description: 'SVG onload tag breakout probe',
  },
  {
    category: 'xss',
    value: 'javascript:/*--></title></style></textarea>*/<script>alert(1)</script>',
    description: 'Polyglot HTML tag breaker',
  },

  // 2. SQL / NoSQL Injection Patterns
  {
    category: 'sqli',
    value: "' OR '1'='1' --",
    description: 'Standard SQL tautology with trailing comment',
  },
  {
    category: 'sqli',
    value: '{"$gt": ""}',
    description: 'NoSQL selector object injection',
  },

  // 3. Multi-byte Unicode & RTL Override
  {
    category: 'unicode',
    value: '\u202Ereversed_filename.exe',
    description: 'Right-to-Left Override (RTLO) visual deception',
  },
  {
    category: 'unicode',
    value: 'Z\u0300\u0301\u0302\u0303\u0304a\u0305\u0306l\u0307\u0308g\u0309\u030Ao\u030B\u030C',
    description: 'Zalgo combining diacritics layout stressor',
  },
  {
    category: 'unicode',
    value: '\u200B\u200C\u200D\uFEFF',
    description: 'Zero-width spaces and non-joiners',
  },
  {
    category: 'unicode',
    value: '🔥💀🚀🧪🤖💥👾',
    description: 'Multi-byte 4-byte astral plane emoji sequence',
  },

  // 4. String Boundary & Memory Overflows
  {
    category: 'overflow',
    value: 'A'.repeat(8192),
    description: '8KB repeated character memory overflow',
  },
  {
    category: 'overflow',
    value: '   \r\n\t   ',
    description: 'Pure whitespace carriage-return tab string',
  },
  {
    category: 'overflow',
    value: '',
    description: 'Zero-length empty string',
  },

  // 5. Numeric Extremes & Floating Point Quirks
  {
    category: 'numeric',
    value: 9007199254740992, // Number.MAX_SAFE_INTEGER + 1
    description: 'Integer boundary exceeding IEEE-754 precision',
  },
  {
    category: 'numeric',
    value: -0,
    description: 'Negative zero floating point anomaly',
  },
  {
    category: 'numeric',
    value: 0.00000000000000001,
    description: 'Sub-normal epsilon floating point value',
  },
  {
    category: 'numeric',
    value: -999999999,
    description: 'Negative integer extreme',
  },

  // 6. Prototype Pollution Probes
  {
    category: 'proto_pollution',
    value: '{"__proto__":{"polluted":true}}',
    description: 'Prototype pollution JSON probe',
  },
];

export class AdversarialPayloadGenerator {
  /**
   * Retrieves all catalogued payloads.
   */
  public getAllPayloads(): AdversarialPayload[] {
    return [...ADVERSARIAL_PAYLOAD_CATALOG];
  }

  /**
   * Returns a random payload filtered optionally by category.
   */
  public getRandomPayload(category?: AdversarialPayload['category']): string | number {
    const list = category
      ? ADVERSARIAL_PAYLOAD_CATALOG.filter((p) => p.category === category)
      : ADVERSARIAL_PAYLOAD_CATALOG;

    if (list.length === 0) return 'fallback_chaos_payload';
    const index = Math.floor(Math.random() * list.length);
    return list[index].value;
  }

  /**
   * Generates a suite of diverse edge-case inputs for a given input element type.
   */
  public getPayloadsForInputType(
    inputType: 'text' | 'number' | 'email' | 'url' | 'search' | 'password' = 'text'
  ): (string | number)[] {
    if (inputType === 'number') {
      return [0, -1, 9007199254740992, 0.000001, -999999];
    }
    if (inputType === 'email') {
      return [
        'test@example.com',
        '"><script>@test.com',
        'user@' + 'a'.repeat(255) + '.com',
        'admin@localhost',
      ];
    }
    if (inputType === 'url') {
      return [
        'javascript:void(0)',
        'data:text/html,<script>alert(1)</script>',
        'https://example.com/test?query=' + encodeURIComponent('<svg/onload=1>'),
      ];
    }
    return [
      '<img src=x onerror=1>',
      "' OR 1=1 --",
      '🔥💀🚀',
      'A'.repeat(500),
      '\u200B\u200C',
      '',
    ];
  }
}

export const globalPayloadGenerator = new AdversarialPayloadGenerator();
