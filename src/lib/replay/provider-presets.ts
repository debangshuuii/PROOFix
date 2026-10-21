/**
 * Pre-Configured SaaS Provider Presets (Contribution 147)
 * Stripe, GitHub, OpenAI, Twilio, and Auth0 Deterministic Mocks & Chaos Profiles
 */

import type {
  TrafficCassette,
  FaultInjectionRule,
} from '../types/mock-replay.ts';
import { normalizeRequest } from './request-normalizer.ts';

export function createStripePaymentIntentSuccessPreset(): TrafficCassette {
  const req = normalizeRequest({
    method: 'POST',
    url: 'https://api.stripe.com/v1/payment_intents',
    body: 'amount=4999&currency=usd&payment_method_types[]=card',
  });

  return {
    id: 'cas_preset_stripe_success',
    name: 'stripe-payment-intent-success',
    version: '1.0.0',
    createdAt: '2026-10-21T00:00:00.000Z',
    updatedAt: '2026-10-21T00:00:00.000Z',
    scope: 'stripe',
    interactions: [
      {
        id: 'int_stripe_pi_1',
        order: 1,
        provider: 'stripe',
        request: req,
        response: {
          statusCode: 200,
          statusText: 'OK',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            id: 'pi_3MtwBwLkdIwHu7ix28a3tqPa',
            object: 'payment_intent',
            amount: 4999,
            currency: 'usd',
            status: 'succeeded',
            client_secret: 'pi_3MtwBwLkdIwHu7ix28a3tqPa_secret_test',
            created: 1776750000,
          }),
          durationMs: 82,
        },
        timesReplayed: 0,
        createdAt: '2026-10-21T00:00:00.000Z',
      },
    ],
    metadata: {
      recordedBy: 'PROOFix Preset Engine',
      totalInteractions: 1,
      providers: ['stripe'],
      scrubbedSecretsCount: 1,
    },
  };
}

export function createStripeCardDeclinedPreset(): TrafficCassette {
  const req = normalizeRequest({
    method: 'POST',
    url: 'https://api.stripe.com/v1/payment_intents',
    body: 'amount=4999&currency=usd&payment_method=pm_card_chargeDeclined',
  });

  return {
    id: 'cas_preset_stripe_declined',
    name: 'stripe-card-declined',
    version: '1.0.0',
    createdAt: '2026-10-21T00:00:00.000Z',
    updatedAt: '2026-10-21T00:00:00.000Z',
    scope: 'stripe',
    interactions: [
      {
        id: 'int_stripe_declined_1',
        order: 1,
        provider: 'stripe',
        request: req,
        response: {
          statusCode: 402,
          statusText: 'Payment Required',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            error: {
              code: 'card_declined',
              decline_code: 'insufficient_funds',
              doc_url: 'https://stripe.com/docs/error-codes/card-declined',
              message: 'Your card has insufficient funds.',
              type: 'card_error',
            },
          }),
          durationMs: 65,
        },
        timesReplayed: 0,
        createdAt: '2026-10-21T00:00:00.000Z',
      },
    ],
    metadata: {
      recordedBy: 'PROOFix Preset Engine',
      totalInteractions: 1,
      providers: ['stripe'],
      scrubbedSecretsCount: 0,
    },
  };
}

export function createGitHubPullRequestPreset(): TrafficCassette {
  const req = normalizeRequest({
    method: 'GET',
    url: 'https://api.github.com/repos/owner/repo/pulls/42',
  });

  return {
    id: 'cas_preset_github_pr',
    name: 'github-pull-request-details',
    version: '1.0.0',
    createdAt: '2026-10-21T00:00:00.000Z',
    updatedAt: '2026-10-21T00:00:00.000Z',
    scope: 'github',
    interactions: [
      {
        id: 'int_gh_pr_1',
        order: 1,
        provider: 'github',
        request: req,
        response: {
          statusCode: 200,
          statusText: 'OK',
          headers: {
            'content-type': 'application/json',
            'x-ratelimit-limit': '5000',
            'x-ratelimit-remaining': '4980',
          },
          body: JSON.stringify({
            id: 10420001,
            number: 42,
            title: 'fix(auth): secure session token cookies',
            state: 'open',
            user: { login: 'octocat', id: 1 },
            mergeable: true,
          }),
          durationMs: 45,
        },
        timesReplayed: 0,
        createdAt: '2026-10-21T00:00:00.000Z',
      },
    ],
  };
}

export function createOpenAiCompletionPreset(): TrafficCassette {
  const req = normalizeRequest({
    method: 'POST',
    url: 'https://api.openai.com/v1/chat/completions',
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Synthesize code diagnosis' }],
    }),
  });

  return {
    id: 'cas_preset_openai_success',
    name: 'openai-chat-completion',
    version: '1.0.0',
    createdAt: '2026-10-21T00:00:00.000Z',
    updatedAt: '2026-10-21T00:00:00.000Z',
    scope: 'openai',
    interactions: [
      {
        id: 'int_openai_1',
        order: 1,
        provider: 'openai',
        request: req,
        response: {
          statusCode: 200,
          statusText: 'OK',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            id: 'chatcmpl-9Abcde',
            object: 'chat.completion',
            created: 1776751200,
            model: 'gpt-4o',
            choices: [
              {
                index: 0,
                message: { role: 'assistant', content: 'Diagnosis: memory leak detected in cache store.' },
                finish_reason: 'stop',
              },
            ],
            usage: { prompt_tokens: 15, completion_tokens: 12, total_tokens: 27 },
          }),
          durationMs: 310,
        },
        timesReplayed: 0,
        createdAt: '2026-10-21T00:00:00.000Z',
      },
    ],
  };
}

export function createTwilioSmsSuccessPreset(): TrafficCassette {
  const req = normalizeRequest({
    method: 'POST',
    url: 'https://api.twilio.com/2010-04-01/Accounts/AC123/Messages.json',
    body: 'To=%2B15551234567&From=%2B15557654321&Body=Verification+Code%3A+849201',
  });

  return {
    id: 'cas_preset_twilio_sms',
    name: 'twilio-sms-sent',
    version: '1.0.0',
    createdAt: '2026-10-21T00:00:00.000Z',
    updatedAt: '2026-10-21T00:00:00.000Z',
    scope: 'twilio',
    interactions: [
      {
        id: 'int_twilio_1',
        order: 1,
        provider: 'twilio',
        request: req,
        response: {
          statusCode: 201,
          statusText: 'Created',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            sid: 'SM1234567890abcdef',
            status: 'queued',
            to: '+15551234567',
            from: '+15557654321',
          }),
          durationMs: 95,
        },
        timesReplayed: 0,
        createdAt: '2026-10-21T00:00:00.000Z',
      },
    ],
  };
}

export const PRESET_FAULT_RULES: Record<string, FaultInjectionRule> = {
  'stripe_rate_limit': {
    id: 'rule_preset_stripe_rate_limit',
    name: 'Simulate Stripe 429 Rate Limit',
    enabled: true,
    targetProvider: 'stripe',
    faultType: 'rate_limit_429',
    params: { retryAfterSecs: 60 },
  },
  'stripe_outage_503': {
    id: 'rule_preset_stripe_outage',
    name: 'Simulate Stripe 503 Gateway Outage',
    enabled: true,
    targetProvider: 'stripe',
    faultType: 'http_status_override',
    params: { statusCode: 503, statusText: 'Service Unavailable', errorMessage: 'Stripe API temporarily unreachable' },
  },
  'github_secondary_rate_limit': {
    id: 'rule_preset_github_secondary_rate',
    name: 'Simulate GitHub Secondary Rate Limit',
    enabled: true,
    targetProvider: 'github',
    faultType: 'http_status_override',
    params: {
      statusCode: 403,
      statusText: 'Forbidden',
      errorMessage: 'You have exceeded a secondary rate limit. Please wait a few minutes before you try again.',
    },
  },
  'openai_quota_exceeded': {
    id: 'rule_preset_openai_quota',
    name: 'Simulate OpenAI Insufficient Quota',
    enabled: true,
    targetProvider: 'openai',
    faultType: 'http_status_override',
    params: {
      statusCode: 429,
      statusText: 'Too Many Requests',
      errorMessage: 'You exceeded your current quota, please check your plan and billing details.',
    },
  },
};

/**
 * Returns a provider preset cassette by provider name and scenario.
 */
export function getProviderPreset(provider: string, scenario: string = 'default'): TrafficCassette | null {
  const p = provider.toLowerCase();
  const s = scenario.toLowerCase();

  if (p === 'stripe') {
    if (s.includes('decline')) return createStripeCardDeclinedPreset();
    return createStripePaymentIntentSuccessPreset();
  }

  if (p === 'github') {
    return createGitHubPullRequestPreset();
  }

  if (p === 'openai') {
    return createOpenAiCompletionPreset();
  }

  if (p === 'twilio') {
    return createTwilioSmsSuccessPreset();
  }

  return null;
}

/**
 * Lists all available provider preset scenarios.
 */
export function getAllAvailablePresets(): { provider: string; scenarios: string[] }[] {
  return [
    { provider: 'stripe', scenarios: ['payment-intent-success', 'card-declined'] },
    { provider: 'github', scenarios: ['pull-request-details'] },
    { provider: 'openai', scenarios: ['chat-completion'] },
    { provider: 'twilio', scenarios: ['sms-sent'] },
  ];
}
