// Test script for semantic vehicle search service
// Validates natural language vehicle queries using RAG pipeline

import 'dotenv/config';
import { Pool } from 'pg';
import { DatabaseConnection } from '@infrastructure/database/connection';
import { VehicleRepository } from '@infrastructure/database/repositories/vehicle.repository';
import { AIProviderFactory } from "@infrastructure/ai/ai-provider-factory";
import { PgVectorStore } from '@infrastructure/ai/vector-stores/pgvector-store';
import { SemanticVehicleSearchService } from '@application/services/semantic-vehicle-search.service';
import { dbConfig } from '@infrastructure/config/database';
import { aiConfig } from '@infrastructure/config/ai';

async function testSemanticSearch() {
  console.log('=== Semantic Vehicle Search Test ===\n');

  const dbConnection = DatabaseConnection.getInstance();
  const pool = new Pool({
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database,
    user: dbConfig.username,
    password: dbConfig.password
  });

  console.log('Initializing services...');
  const embeddingService = AIProviderFactory.createEmbeddingService();
  const vectorStore = new PgVectorStore(pool, aiConfig.vectorStore.tableName);

  // Initialize vector store table
  console.log('Initializing vector store...');
  await vectorStore.initialize();
  console.log('Vector store initialized\n');

  const llmProvider = AIProviderFactory.createLLMProvider();
  const vehicleRepository = new VehicleRepository(dbConnection);

  const searchService = new SemanticVehicleSearchService(
    embeddingService,
    vectorStore,
    llmProvider,
    vehicleRepository
  );

  // Health check
  console.log('Performing health check...');
  const health = await searchService.healthCheck();
  console.log('Health Status:');
  console.log(`- Embedding Service: ${health.embeddingService ? 'OK' : 'FAILED'}`);
  console.log(`- Vector Store: ${health.vectorStore ? 'OK' : 'FAILED'}`);
  console.log(`- LLM Provider: ${health.llmProvider ? 'OK' : 'FAILED'}`);

  if (!health.embeddingService || !health.llmProvider) {
    console.error('\nERROR: One or more services are unavailable');
    process.exit(1);
  }

  // Populate vector store with vehicle data
  const vectorCount = await vectorStore.getCount();
  console.log(`\nCurrent vector count: ${vectorCount}`);

  if (vectorCount === 0) {
    console.log('Populating vector store with vehicle data...');
    const vehicles = await vehicleRepository.findAvailableVehicles();
    console.log(`Found ${vehicles.length} vehicles to index`);

    for (const vehicle of vehicles.slice(0, 10)) {
      const content = `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.condition} ${vehicle.specification.fuelType} ${vehicle.specification.transmission} ${vehicle.description || ''}`;
      const embedding = await embeddingService.embedText(content);

      await vectorStore.addDocument({
        id: vehicle.id,
        content,
        embedding,
        metadata: {
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          price: vehicle.price,
          condition: vehicle.condition
        }
      });
    }

    console.log(`Indexed ${Math.min(vehicles.length, 10)} vehicles\n`);
  }

  // Test queries
  const testQueries = [
    'affordable family SUV under 400000 pesos',
    'luxury sedan with low mileage',
    'reliable pickup truck for work',
    'compact car for city driving'
  ];

  console.log('\n=== Testing Semantic Search ===\n');

  for (const query of testQueries) {
    console.log(`Query: "${query}"`);
    console.log('-'.repeat(60));

    try {
      const result = await searchService.searchVehicles(query, {
        limit: 3,
        threshold: 0.4,
        useReranking: true
      });

      if (result.interpretation) {
        console.log(`Interpretation: ${result.interpretation}`);
      }

      console.log(`Found ${result.vehicles.length} vehicles:\n`);

      for (let i = 0; i < result.vehicles.length; i++) {
        const vehicle = result.vehicles[i];
        const score = result.relevanceScores[i];

        if (vehicle && score) {
          console.log(`${i + 1}. ${vehicle.getDisplayName()}`);
          console.log(`   Price: $${vehicle.price.toLocaleString()} MXN`);
          console.log(`   Condition: ${vehicle.condition}`);
          console.log(`   Mileage: ${vehicle.mileage.toLocaleString()} km`);
          console.log(`   Relevance: ${(score.score * 100).toFixed(1)}%`);
          console.log();
        }
      }
    } catch (error) {
      console.error(`ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    console.log();
  }

  // Test contextual search
  console.log('\n=== Testing Contextual Search ===\n');

  const contextMessages = [
    { role: 'user' as const, content: 'I need a family car' },
    { role: 'assistant' as const, content: 'I can help you find a family vehicle. What is your budget?' },
    { role: 'user' as const, content: 'Around 350000 pesos' }
  ];

  const contextualQuery = 'something reliable with good safety';

  console.log('Conversation Context:');
  contextMessages.forEach(msg => {
    console.log(`${msg.role === 'user' ? 'Customer' : 'Assistant'}: ${msg.content}`);
  });
  console.log(`\nContextual Query: "${contextualQuery}"`);
  console.log('-'.repeat(60));

  try {
    const result = await searchService.searchWithContext(
      contextualQuery,
      contextMessages,
      { limit: 3, threshold: 0.4 }
    );

    console.log(`Found ${result.vehicles.length} vehicles:\n`);

    result.vehicles.forEach((vehicle, i) => {
      const score = result.relevanceScores[i];
      if (score) {
        console.log(`${i + 1}. ${vehicle.getDisplayName()}`);
        console.log(`   Price: $${vehicle.price.toLocaleString()} MXN`);
        console.log(`   Relevance: ${(score.score * 100).toFixed(1)}%`);
        console.log();
      }
    });
  } catch (error) {
    console.error(`ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Test recommendations
  console.log('\n=== Testing Vehicle Recommendations ===\n');

  const allVehicles = await vehicleRepository.findAvailableVehicles();
  if (allVehicles.length > 0) {
    const referenceVehicle = allVehicles[0];
    if (referenceVehicle) {
      console.log(`Reference Vehicle: ${referenceVehicle.getDisplayName()}`);
      console.log('-'.repeat(60));

      try {
        const recommendations = await searchService.getRecommendations(
          referenceVehicle.id,
          'similar vehicles with comparable features'
        );

        console.log(`Found ${recommendations.vehicles.length} recommendations:\n`);

        recommendations.vehicles.forEach((vehicle, i) => {
          const score = recommendations.relevanceScores[i];
          if (score) {
            console.log(`${i + 1}. ${vehicle.getDisplayName()}`);
            console.log(`   Price: $${vehicle.price.toLocaleString()} MXN`);
            console.log(`   Relevance: ${(score.score * 100).toFixed(1)}%`);
            console.log();
          }
        });
      } catch (error) {
        console.error(`ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  await dbConnection.close();
  console.log('\nTest completed successfully!');
}

testSemanticSearch().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
