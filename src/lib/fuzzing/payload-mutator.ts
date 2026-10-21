/**
 * Boundary Value & Type Confusion Payload Mutator (Contribution 133)
 */

import type {
  EndpointContract,
  ParameterContract,
  SchemaPropertyContract,
  FuzzPayload,
  FuzzStrategyType,
} from '../types/api-fuzzing.ts';

export interface MutationContext {
  endpointId: string;
  targetParameter?: string;
  targetField?: string;
}

/**
 * Generates boundary value mutations for a numeric/integer schema
 */
export function generateNumericBoundaryValues(
  schema: { minimum?: number; maximum?: number; type?: string },
  context: MutationContext
): FuzzPayload[] {
  const payloads: FuzzPayload[] = [];
  const min = schema.minimum !== undefined ? schema.minimum : 0;
  const max = schema.maximum !== undefined ? schema.maximum : 100000;

  const testValues: { val: any; desc: string }[] = [
    { val: 0, desc: 'Zero boundary' },
    { val: -1, desc: 'Negative boundary' },
    { val: min, desc: 'Exact minimum allowed' },
    { val: min - 1, desc: 'Below minimum allowed (min - 1)' },
    { val: max, desc: 'Exact maximum allowed' },
    { val: max + 1, desc: 'Above maximum allowed (max + 1)' },
    { val: 2147483647, desc: '32-bit signed integer max (2^31 - 1)' },
    { val: -2147483648, desc: '32-bit signed integer min (-2^31)' },
    { val: Number.MAX_SAFE_INTEGER, desc: 'JavaScript MAX_SAFE_INTEGER (2^53 - 1)' },
    { val: 0.000000001, desc: 'Sub-normal floating point epsilon' },
    { val: 99999999999999999999999999999999999999, desc: 'Extreme numeric overflow' },
  ];

  for (let i = 0; i < testValues.length; i++) {
    const item = testValues[i];
    payloads.push({
      id: `pl_bound_num_${i}_${Date.now()}`,
      strategy: 'boundary_values',
      endpointId: context.endpointId,
      targetParameter: context.targetParameter,
      targetField: context.targetField,
      value: item.val,
      description: item.desc,
    });
  }

  return payloads;
}

/**
 * Generates boundary value mutations for a string schema
 */
export function generateStringBoundaryValues(
  schema: { minLength?: number; maxLength?: number; enum?: any[] },
  context: MutationContext
): FuzzPayload[] {
  const payloads: FuzzPayload[] = [];
  const minLen = schema.minLength !== undefined ? schema.minLength : 0;
  const maxLen = schema.maxLength !== undefined ? schema.maxLength : 255;

  const testValues: { val: any; desc: string }[] = [
    { val: '', desc: 'Empty string boundary' },
    { val: '   ', desc: 'Whitespace-only string' },
    { val: 'a'.repeat(Math.max(0, minLen - 1)), desc: 'Below minimum length allowed' },
    { val: 'a'.repeat(minLen), desc: 'Exact minimum length allowed' },
    { val: 'a'.repeat(maxLen), desc: 'Exact maximum length allowed' },
    { val: 'a'.repeat(maxLen + 50), desc: 'Above maximum length allowed' },
    { val: 'A'.repeat(5000), desc: 'Large 5KB string payload boundary' },
  ];

  if (schema.enum && schema.enum.length > 0) {
    testValues.push({
      val: '__INVALID_ENUM_OPTION_PROOF_TEST__',
      desc: 'Invalid non-whitelisted enum token',
    });
  }

  for (let i = 0; i < testValues.length; i++) {
    const item = testValues[i];
    payloads.push({
      id: `pl_bound_str_${i}_${Date.now()}`,
      strategy: 'boundary_values',
      endpointId: context.endpointId,
      targetParameter: context.targetParameter,
      targetField: context.targetField,
      value: item.val,
      description: item.desc,
    });
  }

  return payloads;
}

/**
 * Generates type confusion mutations (e.g. array where string expected, object where integer expected)
 */
export function generateTypeConfusionValues(
  targetType: string,
  context: MutationContext
): FuzzPayload[] {
  const payloads: FuzzPayload[] = [];

  const confusionMap: Record<string, { val: any; desc: string }[]> = {
    string: [
      { val: 123456, desc: 'Integer provided where string expected' },
      { val: true, desc: 'Boolean true provided where string expected' },
      { val: ['array', 'element'], desc: 'Array provided where string expected' },
      { val: { nestedKey: 'val' }, desc: 'Object provided where string expected' },
      { val: null, desc: 'Explicit null provided where string expected' },
    ],
    number: [
      { val: 'not_a_number_string', desc: 'Alphabetical string where number expected' },
      { val: true, desc: 'Boolean true where number expected' },
      { val: [100, 200], desc: 'Numeric array where scalar number expected' },
      { val: { value: 100 }, desc: 'Object where number expected' },
      { val: null, desc: 'Explicit null where number expected' },
    ],
    integer: [
      { val: 12.34567, desc: 'Floating point float where integer expected' },
      { val: 'forty-two', desc: 'String where integer expected' },
      { val: false, desc: 'Boolean false where integer expected' },
      { val: [1, 2, 3], desc: 'Array where integer expected' },
      { val: null, desc: 'Explicit null where integer expected' },
    ],
    boolean: [
      { val: 'true', desc: 'String "true" where boolean primitive expected' },
      { val: 1, desc: 'Integer 1 where boolean expected' },
      { val: [true], desc: 'Array where boolean expected' },
      { val: { enabled: true }, desc: 'Object where boolean expected' },
    ],
    array: [
      { val: 'scalar_string_not_array', desc: 'Scalar string where array expected' },
      { val: 999, desc: 'Integer where array expected' },
      { val: { 0: 'a', 1: 'b' }, desc: 'Object where array expected' },
      { val: null, desc: 'Null where array expected' },
    ],
    object: [
      { val: 'string_primitive_not_object', desc: 'String where object expected' },
      { val: 12345, desc: 'Integer where object expected' },
      { val: ['item1', 'item2'], desc: 'Array where object expected' },
      { val: true, desc: 'Boolean where object expected' },
    ],
  };

  const tests = confusionMap[targetType.toLowerCase()] || confusionMap.string;

  for (let i = 0; i < tests.length; i++) {
    const item = tests[i];
    payloads.push({
      id: `pl_type_conf_${targetType}_${i}_${Date.now()}`,
      strategy: 'type_confusion',
      endpointId: context.endpointId,
      targetParameter: context.targetParameter,
      targetField: context.targetField,
      value: item.val,
      description: item.desc,
    });
  }

  return payloads;
}

/**
 * Generates a full suite of boundary and type confusion payloads for an endpoint.
 */
export function generatePayloadsForEndpoint(
  endpoint: EndpointContract,
  allowedStrategies: FuzzStrategyType[] = ['boundary_values', 'type_confusion']
): FuzzPayload[] {
  const result: FuzzPayload[] = [];

  // 1. Mutate Parameters (Path, Query, Header)
  for (const param of endpoint.parameters) {
    const context: MutationContext = {
      endpointId: endpoint.id,
      targetParameter: param.name,
    };

    if (allowedStrategies.includes('boundary_values')) {
      if (param.type === 'integer' || param.type === 'number') {
        result.push(...generateNumericBoundaryValues(param, context));
      } else if (param.type === 'string') {
        result.push(...generateStringBoundaryValues(param, context));
      }
    }

    if (allowedStrategies.includes('type_confusion')) {
      result.push(...generateTypeConfusionValues(param.type, context));
    }
  }

  // 2. Mutate Request Body Fields (if JSON object)
  const reqBody = endpoint.requestBody;
  if (reqBody && reqBody.schema && reqBody.schema.properties) {
    for (const [fieldName, propDef] of Object.entries(reqBody.schema.properties)) {
      const context: MutationContext = {
        endpointId: endpoint.id,
        targetField: fieldName,
      };

      if (allowedStrategies.includes('boundary_values')) {
        if (propDef.type === 'integer' || propDef.type === 'number') {
          result.push(...generateNumericBoundaryValues(propDef, context));
        } else if (propDef.type === 'string') {
          result.push(...generateStringBoundaryValues(propDef, context));
        }
      }

      if (allowedStrategies.includes('type_confusion')) {
        result.push(...generateTypeConfusionValues(propDef.type || 'string', context));
      }
    }
  }

  return result;
}
