// Test script for Ollama text generation capabilities
// Validates that Ollama can generate text responses using llama3.2 model

import { aiConfig } from '../src/infrastructure/config/ai';

interface GenerateRequest {
  model: string;
  prompt: string;
  stream: boolean;
}

interface GenerateResponse {
  model: string;
  response: string;
  done: boolean;
}

async function testTextGeneration(): Promise<void> {
  console.log('='.repeat(60));
  console.log('Ollama Text Generation Test');
  console.log('='.repeat(60));
  console.log();

  const testPrompt = 'Recommend a reliable family SUV in one sentence.';

  console.log(`Testing model: ${aiConfig.ollama.defaultModel}`);
  console.log(`Prompt: "${testPrompt}"`);
  console.log();
  console.log('Generating response...');
  console.log();

  try {
    // Use the full model name with tag (llama3.2:1b instead of just llama3.2)
    const modelName = 'llama3.2:1b';

    const requestBody: GenerateRequest = {
      model: modelName,
      prompt: testPrompt,
      stream: false
    };

    const response = await fetch(`${aiConfig.ollama.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(aiConfig.ollama.timeout)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as GenerateResponse;

    console.log('Response:');
    console.log('-'.repeat(60));
    console.log(data.response.trim());
    console.log('-'.repeat(60));
    console.log();
    console.log(`Model: ${data.model}`);
    console.log(`Status: ${data.done ? 'Complete' : 'Incomplete'}`);
    console.log();
    console.log('='.repeat(60));
    console.log('SUCCESS: Text generation working correctly');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('ERROR: Text generation failed');
    console.error(error);
    console.log();
    console.log('Troubleshooting:');
    console.log('1. Ensure Ollama is running: docker ps | grep ollama');
    console.log('2. Verify model is installed: npm run verify:ollama');
    console.log(`3. Check model name matches: ${aiConfig.ollama.defaultModel}`);
    process.exit(1);
  }
}

testTextGeneration().catch(error => {
  console.error('FATAL ERROR:', error);
  process.exit(1);
});
