import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AdversarialPayloadGenerator,
  globalPayloadGenerator,
} from '../src/lib/crawler/adversarial-payloads.ts';

test('getAllPayloads returns complete catalog across all 6 attack vectors', () => {
  const payloads = globalPayloadGenerator.getAllPayloads();
  assert.ok(payloads.length >= 10);

  const categories = new Set(payloads.map((p) => p.category));
  assert.ok(categories.has('xss'));
  assert.ok(categories.has('sqli'));
  assert.ok(categories.has('unicode'));
  assert.ok(categories.has('overflow'));
  assert.ok(categories.has('numeric'));
  assert.ok(categories.has('proto_pollution'));
});

test('getRandomPayload returns valid values filtered by category', () => {
  const gen = new AdversarialPayloadGenerator();

  const xss = gen.getRandomPayload('xss');
  assert.equal(typeof xss, 'string');
  assert.ok(xss.includes('<'));

  const num = gen.getRandomPayload('numeric');
  assert.equal(typeof num, 'number');
});

test('getPayloadsForInputType tailors payloads to HTML input types', () => {
  const gen = new AdversarialPayloadGenerator();

  const numPayloads = gen.getPayloadsForInputType('number');
  assert.ok(numPayloads.some((v) => typeof v === 'number' && v > 1000000));

  const emailPayloads = gen.getPayloadsForInputType('email');
  assert.ok(emailPayloads.some((v) => typeof v === 'string' && v.includes('@')));
});
