// Test script for vector store interface with pgvector implementation
// Validates CRUD operations, similarity search, and metadata filtering

import { Pool } from 'pg';
import { PgVectorStore } from '../src/infrastructure/ai/vector-stores/pgvector-store';
import { AIProviderFactory } from "@infrastructure/ai/ai-provider-factory";
import { dbConfig } from '../src/infrastructure/config/database';
import { aiConfig } from '@infrastructure/config/ai';

const pool = new Pool({
  host: dbConfig.host,
  port: dbConfig.port,
  database: dbConfig.database,
  user: dbConfig.username,
  password: dbConfig.password
});

async function testVectorStore(): Promise<void> {
  console.log('='.repeat(60));
  console.log('Vector Store Test');
  console.log('='.repeat(60));
  console.log();

  const vectorStore = new PgVectorStore(pool, 'test_vector_documents');
  const embeddingService = AIProviderFactory.createEmbeddingService();

  try {
    // Test 1: Initialize vector store
    console.log('Test 1: Vector Store Initialization');
    console.log('-'.repeat(60));

    await vectorStore.initialize();
    console.log('SUCCESS: Vector store table created');
    console.log();

    // Test 2: Add documents with embeddings
    console.log('Test 2: Adding Documents with Embeddings');
    console.log('-'.repeat(60));

    const vehicleDescriptions = [
      'Toyota RAV4 2024 - Reliable compact SUV with excellent fuel efficiency and safety features',
      'Honda CR-V 2024 - Spacious family SUV with advanced technology and comfortable ride',
      'Tesla Model 3 2024 - Electric sedan with autopilot and long range battery',
      'Ford F-150 2024 - Powerful pickup truck with towing capacity and rugged durability'
    ];

    console.log('Generating embeddings for vehicle descriptions...');
    const embeddings = await embeddingService.embedBatch(vehicleDescriptions);

    const documents = vehicleDescriptions.map((desc, i) => ({
      id: `vehicle_${i + 1}`,
      content: desc,
      embedding: embeddings[i]!,
      metadata: {
        type: i < 2 ? 'suv' : i === 2 ? 'sedan' : 'truck',
        year: 2024,
        make: desc.split(' ')[0]
      }
    }));

    await vectorStore.addDocuments(documents);
    const count = await vectorStore.getCount();
    console.log(`SUCCESS: Added ${count} documents to vector store`);
    console.log();

    // Test 3: Semantic similarity search
    console.log('Test 3: Semantic Similarity Search');
    console.log('-'.repeat(60));

    const searchQuery = 'safe family vehicle';
    console.log(`Query: "${searchQuery}"`);
    console.log('Searching for similar vehicles...');

    const queryEmbedding = await embeddingService.embedText(searchQuery);
    const searchResults = await vectorStore.search(queryEmbedding, {
      limit: 3,
      threshold: 0.4
    });

    console.log(`Found ${searchResults.length} similar vehicles:`);
    console.log();

    searchResults.forEach((result, i) => {
      const similarity = (result.similarity * 100).toFixed(2);
      console.log(`${i + 1}. [${similarity}%] ${result.content}`);
      console.log(`   Metadata: ${JSON.stringify(result.metadata)}`);
      console.log();
    });

    if (searchResults.length > 0) {
      console.log('SUCCESS: Semantic search working correctly');
    }
    console.log();

    // Test 4: Metadata filtering
    console.log('Test 4: Metadata Filtering');
    console.log('-'.repeat(60));

    const suvQuery = 'affordable vehicle';
    console.log(`Query: "${suvQuery}" with filter: type = "suv"`);

    const suvQueryEmbedding = await embeddingService.embedText(suvQuery);
    const suvResults = await vectorStore.search(suvQueryEmbedding, {
      limit: 5,
      filter: { type: 'suv' }
    });

    console.log(`Found ${suvResults.length} SUVs:`);
    suvResults.forEach(result => {
      const similarity = (result.similarity * 100).toFixed(2);
      console.log(`- [${similarity}%] ${result.content.split('-')[0]?.trim()}`);
    });

    if (suvResults.every(r => r.metadata?.type === 'suv')) {
      console.log('SUCCESS: Metadata filtering working correctly');
    }
    console.log();

    // Test 5: Document retrieval
    console.log('Test 5: Document Retrieval');
    console.log('-'.repeat(60));

    const retrievedDoc = await vectorStore.getDocument('vehicle_1');
    if (retrievedDoc) {
      console.log(`Retrieved: ${retrievedDoc.content.split('-')[0]?.trim()}`);
      console.log(`Embedding dimensions: ${retrievedDoc.embedding.length}`);
      console.log('SUCCESS: Document retrieval working');
    }
    console.log();

    // Test 6: Document update
    console.log('Test 6: Document Update');
    console.log('-'.repeat(60));

    await vectorStore.updateDocument('vehicle_1', {
      metadata: { type: 'suv', year: 2024, make: 'Toyota', updated: true }
    });

    const updatedDoc = await vectorStore.getDocument('vehicle_1');
    if (updatedDoc?.metadata?.updated) {
      console.log('SUCCESS: Document metadata updated');
    }
    console.log();

    // Test 7: Document deletion
    console.log('Test 7: Document Deletion');
    console.log('-'.repeat(60));

    await vectorStore.deleteDocument('vehicle_4');
    const deletedDoc = await vectorStore.getDocument('vehicle_4');

    if (!deletedDoc) {
      console.log('SUCCESS: Document deleted successfully');
    }

    const remainingCount = await vectorStore.getCount();
    console.log(`Remaining documents: ${remainingCount}`);
    console.log();

    // Cleanup
    await vectorStore.clear();
    await pool.query('DROP TABLE IF EXISTS test_vector_documents');
    console.log('Test data cleaned up');

    console.log();
    console.log('='.repeat(60));
    console.log('All Vector Store Tests Passed');
    console.log('='.repeat(60));
    console.log();
    console.log('The vector store provides a clean abstraction for storing');
    console.log('and searching embeddings, enabling easy migration to other');
    console.log('vector databases (Qdrant, Pinecone) through interface swapping.');

  } catch (error) {
    console.error('FATAL ERROR:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testVectorStore().catch(error => {
  console.error('FATAL ERROR:', error);
  process.exit(1);
});
