// Verification script for Ollama infrastructure setup
// Validates Ollama service connectivity and reports system status

import { OllamaClient } from '../src/infrastructure/ai/ollama-client';
import { validateAIConfig } from '../src/infrastructure/config/ai';

async function verifyOllamaSetup(): Promise<void> {
  console.log('='.repeat(60));
  console.log('Ollama Infrastructure Verification');
  console.log('='.repeat(60));
  console.log();

  // Step 1: Validate configuration
  console.log('Step 1: Validating AI configuration...');
  try {
    validateAIConfig();
    console.log('SUCCESS: Configuration validated');
  } catch (error) {
    console.error('ERROR: Configuration validation failed');
    console.error(error);
    process.exit(1);
  }
  console.log();

  // Step 2: Health check
  console.log('Step 2: Checking Ollama service health...');
  const client = new OllamaClient();
  const health = await client.healthCheck();

  if (!health.isHealthy) {
    console.error('ERROR: Ollama service is not healthy');
    console.error(`Base URL: ${health.baseUrl}`);
    console.error(`Error: ${health.error}`);
    console.log();
    console.log('Troubleshooting steps:');
    console.log('1. Ensure Docker is running: docker ps');
    console.log('2. Start Ollama container: docker-compose up -d ollama');
    console.log('3. Check Ollama logs: docker-compose logs ollama');
    process.exit(1);
  }

  console.log('SUCCESS: Ollama service is healthy');
  console.log(`- Base URL: ${health.baseUrl}`);
  console.log(`- Available models: ${health.availableModels.length}`);
  console.log();

  // Step 3: List models
  console.log('Step 3: Listing available models...');
  const models = await client.listModels();

  if (models.length === 0) {
    console.log('INFO: No models installed yet');
    console.log();
    console.log('To download a model, run:');
    console.log('  docker exec -it carbrain_ollama ollama pull llama3.2');
    console.log('  docker exec -it carbrain_ollama ollama pull llama3.2:1b');
  } else {
    console.log(`Found ${models.length} model(s):`);
    models.forEach(model => {
      const sizeGB = (model.size / (1024 ** 3)).toFixed(2);
      console.log(`- ${model.name} (${sizeGB} GB)`);
    });
  }

  console.log();
  console.log('='.repeat(60));
  console.log('Verification Complete: All systems operational');
  console.log('='.repeat(60));
}

verifyOllamaSetup().catch(error => {
  console.error('FATAL ERROR:', error);
  process.exit(1);
});
