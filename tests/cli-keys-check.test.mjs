import test from 'node:test';
import assert from 'node:assert/strict';
import { checkAiProviderKeys, maskApiKey } from '../src/lib/cli/doctor/keys-check.ts';

test('keys-check: maskApiKey masks middle characters safely', () => {
  assert.equal(maskApiKey('AIzaSyD8948293hf93'), 'AIza...hf93');
  assert.equal(maskApiKey('short'), '****');
});

test('keys-check: detects configured Gemini API key', () => {
  const res = checkAiProviderKeys({ GEMINI_API_KEY: 'AIzaSyTestGeminiKey12345' });
  assert.equal(res.status, 'passed');
  assert.ok(res.message.includes('Google Gemini'));
  assert.ok(!res.message.includes('AIzaSyTestGeminiKey12345')); // Ensure secret is masked
});

test('keys-check: detects multiple configured keys', () => {
  const res = checkAiProviderKeys({
    GEMINI_API_KEY: 'AIzaSyTestGeminiKey12345',
    OPENAI_API_KEY: 'sk-proj-TestOpenAiKey99887766'
  });
  assert.equal(res.status, 'passed');
  assert.ok(res.message.includes('Google Gemini'));
  assert.ok(res.message.includes('OpenAI'));
});

test('keys-check: returns warning with heuristic fallback notice when keys are absent', () => {
  const res = checkAiProviderKeys({});
  assert.equal(res.status, 'warning');
  assert.ok(res.message.includes('No external AI provider keys'));
  assert.ok(res.recommendation?.includes('GEMINI_API_KEY'));
});
