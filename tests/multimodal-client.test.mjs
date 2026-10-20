import assert from 'node:assert/strict';
import { queryMultimodalVision } from '../src/lib/vision/multimodal-client.ts';
import { getDefaultSemanticVisionConfig } from '../src/lib/vision/vision-config.ts';
import { prepareVisionImage } from '../src/lib/vision/image-preprocessor.ts';

console.log('--- Testing Multimodal Vision API Client (Contribution 115) ---');

async function testMockProvider() {
  const dummyA = prepareVisionImage(Buffer.from('baseline-image-bytes'));
  const dummyB = prepareVisionImage(Buffer.from('candidate-image-bytes'));

  const config = {
    ...getDefaultSemanticVisionConfig(),
    modelProvider: 'mock',
  };

  const response = await queryMultimodalVision({
    baselineImage: dummyA,
    candidateImage: dummyB,
    prompt: 'Compare images for visual bugs',
    config,
  });

  assert.ok(response.rawText.length > 0);
  assert.ok(response.durationMs >= 0);
  const parsed = JSON.parse(response.rawText);
  assert.ok(Array.isArray(parsed.defects));
  assert.equal(parsed.defects[0].category, 'element_overlap');
  assert.equal(parsed.overallScore, 88);
  console.log('[PASS] Mock vision provider delivers deterministic structured inspection responses for CI.');
}

async function testGeminiApiIntegrationWithMockFetch() {
  const dummyA = prepareVisionImage(Buffer.from('baseline-image-bytes'));
  const dummyB = prepareVisionImage(Buffer.from('candidate-image-bytes'));

  const fakeApiKey = 'AIzaSyFakeGeminiApiKey1234567890';
  let capturedUrl = '';
  let capturedBody = null;

  const mockFetch = async (url, init) => {
    capturedUrl = url;
    capturedBody = JSON.parse(init.body);

    const fakeApiResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  defects: [
                    {
                      category: 'text_clipping',
                      severity: 'medium',
                      title: 'Button Label Truncated',
                      explanation: 'The label "Complete Order" is cut off at the right border.',
                      confidenceScore: 91,
                    },
                  ],
                  layoutShifts: [],
                  overallScore: 94,
                }),
              },
            ],
          },
        },
      ],
      usageMetadata: {
        promptTokenCount: 512,
        candidatesTokenCount: 88,
      },
    };

    return new Response(JSON.stringify(fakeApiResponse), { status: 200 });
  };

  const config = {
    ...getDefaultSemanticVisionConfig(),
    modelProvider: 'gemini_flash',
  };

  const response = await queryMultimodalVision({
    baselineImage: dummyA,
    candidateImage: dummyB,
    prompt: 'Check for text clipping',
    config,
    apiKey: fakeApiKey,
    mockFetch,
  });

  assert.ok(capturedUrl.includes('gemini-1.5-flash:generateContent'));
  assert.ok(capturedUrl.includes(fakeApiKey));
  assert.equal(capturedBody.contents[0].parts.length, 3, 'Must contain prompt and two inline image parts');
  assert.equal(capturedBody.generationConfig.responseMimeType, 'application/json');

  const parsed = JSON.parse(response.rawText);
  assert.equal(parsed.defects[0].category, 'text_clipping');
  assert.equal(response.usage?.promptTokens, 512);
  console.log('[PASS] Gemini API payload correctly structures dual-image multimodal request.');
}

async function testApiKeyRedactionOnError() {
  const dummyA = prepareVisionImage(Buffer.from('baseline-image-bytes'));
  const dummyB = prepareVisionImage(Buffer.from('candidate-image-bytes'));

  const secretKey = 'AIzaSySecretLeakPrevention999999';
  const failingFetch = async () => {
    throw new Error(`Connection failed when calling Google API at key=${secretKey}`);
  };

  const config = {
    ...getDefaultSemanticVisionConfig(),
    modelProvider: 'gemini_flash',
  };

  await assert.rejects(
    async () => {
      await queryMultimodalVision({
        baselineImage: dummyA,
        candidateImage: dummyB,
        prompt: 'Check',
        config,
        apiKey: secretKey,
        mockFetch: failingFetch,
      });
    },
    (err) => {
      assert.ok(!err.message.includes(secretKey), 'API Key must be redacted from error message');
      assert.ok(err.message.includes('[REDACTED_API_KEY]') || err.message.includes('[REDACTED_SECRET]'));
      return true;
    }
  );
  console.log('[PASS] Vision API error sanitization prevents API key leaks.');
}

async function runSuite() {
  await testMockProvider();
  await testGeminiApiIntegrationWithMockFetch();
  await testApiKeyRedactionOnError();
  console.log('\nAll Contribution 115 tests passed cleanly!');
}

runSuite();
