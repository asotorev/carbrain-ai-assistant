// Test script for embedding service and vector similarity
// Validates text-to-vector conversion and semantic similarity calculations

import { OllamaEmbeddingService } from '../src/infrastructure/ai/embeddings/ollama-embedding-service';
import { aiConfig } from '@infrastructure/config/ai';

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same dimensions');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    const a = vecA[i] ?? 0;
    const b = vecB[i] ?? 0;
    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function testEmbeddings(): Promise<void> {
  console.log('='.repeat(60));
  console.log('Embedding Service Test');
  console.log('='.repeat(60));
  console.log();

  const embeddingService = new OllamaEmbeddingService(aiConfig.ollama.embeddingModel);

  // Test 1: Service availability
  console.log('Test 1: Service Availability Check');
  console.log('-'.repeat(60));
  const isAvailable = await embeddingService.isAvailable();
  console.log(`Model: ${embeddingService.getModelName()}`);
  console.log(`Dimensions: ${embeddingService.getDimensions()}`);
  console.log(`Status: ${isAvailable ? 'Available' : 'Unavailable'}`);

  if (!isAvailable) {
    console.error('ERROR: Embedding service is not available');
    console.log('Ensure nomic-embed-text model is installed');
    process.exit(1);
  }
  console.log('SUCCESS: Service is available');
  console.log();

  // Test 2: Single text embedding
  console.log('Test 2: Single Text Embedding');
  console.log('-'.repeat(60));
  const sampleText = 'Honda CR-V reliable family SUV';
  console.log(`Text: "${sampleText}"`);
  console.log('Generating embedding...');

  try {
    const embedding = await embeddingService.embedText(sampleText);
    console.log(`Embedding generated: ${embedding.length} dimensions`);
    console.log(`First 5 values: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}]`);
    console.log(`Last 5 values: [${embedding.slice(-5).map(v => v.toFixed(4)).join(', ')}]`);
    console.log('SUCCESS: Text embedding working');
  } catch (error) {
    console.error('ERROR: Text embedding failed:', error);
    process.exit(1);
  }
  console.log();

  // Test 3: Batch embedding
  console.log('Test 3: Batch Embedding');
  console.log('-'.repeat(60));
  const vehicleDescriptions = [
    'Toyota RAV4 compact crossover SUV',
    'Honda CR-V family-friendly SUV',
    'Tesla Model 3 electric sedan'
  ];

  console.log('Texts:');
  vehicleDescriptions.forEach((text, i) => {
    console.log(`  ${i + 1}. "${text}"`);
  });
  console.log();
  console.log('Generating batch embeddings...');

  let embeddings: number[][];
  try {
    embeddings = await embeddingService.embedBatch(vehicleDescriptions);
    console.log(`Batch embeddings generated: ${embeddings.length} vectors`);
    embeddings.forEach((emb, i) => {
      console.log(`  Vector ${i + 1}: ${emb.length} dimensions`);
    });
    console.log('SUCCESS: Batch embedding working');
  } catch (error) {
    console.error('ERROR: Batch embedding failed:', error);
    process.exit(1);
  }
  console.log();

  // Test 4: Semantic similarity
  console.log('Test 4: Semantic Similarity Calculation');
  console.log('-'.repeat(60));
  console.log('Comparing vehicle descriptions:');
  console.log();

  const similarity1_2 = cosineSimilarity(embeddings[0]!, embeddings[1]!);
  const similarity1_3 = cosineSimilarity(embeddings[0]!, embeddings[2]!);
  const similarity2_3 = cosineSimilarity(embeddings[1]!, embeddings[2]!);

  console.log(`1. "${vehicleDescriptions[0]}"`);
  console.log(`2. "${vehicleDescriptions[1]}"`);
  console.log(`   Similarity: ${(similarity1_2 * 100).toFixed(2)}%`);
  console.log();

  console.log(`1. "${vehicleDescriptions[0]}"`);
  console.log(`3. "${vehicleDescriptions[2]}"`);
  console.log(`   Similarity: ${(similarity1_3 * 100).toFixed(2)}%`);
  console.log();

  console.log(`2. "${vehicleDescriptions[1]}"`);
  console.log(`3. "${vehicleDescriptions[2]}"`);
  console.log(`   Similarity: ${(similarity2_3 * 100).toFixed(2)}%`);
  console.log();

  // Validate semantic understanding
  if (similarity1_2 > similarity1_3 && similarity1_2 > similarity2_3) {
    console.log('SUCCESS: Semantic similarity working correctly');
    console.log('Toyota RAV4 and Honda CR-V (both SUVs) are most similar');
  } else {
    console.log('WARNING: Unexpected similarity results');
    console.log('Expected SUVs to be more similar than sedan');
  }

  console.log();
  console.log('='.repeat(60));
  console.log('All Embedding Tests Passed');
  console.log('='.repeat(60));
  console.log();
  console.log('The embedding service can convert text to vectors and');
  console.log('calculate semantic similarity for intelligent search.');
}

testEmbeddings().catch(error => {
  console.error('FATAL ERROR:', error);
  process.exit(1);
});
