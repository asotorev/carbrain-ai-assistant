// Test script for conversational RAG service
// Demonstrates multi-turn vehicle search conversations with context

import 'dotenv/config';
import { Pool } from 'pg';
import { DatabaseConnection } from '@infrastructure/database/connection';
import { VehicleRepository } from '@infrastructure/database/repositories/vehicle.repository';
import { PgVectorStore } from '@infrastructure/ai/vector-stores/pgvector-store';
import { AIProviderFactory } from '@infrastructure/ai/ai-provider-factory';
import { SemanticVehicleSearchService } from '@application/services/semantic-vehicle-search.service';
import { ConversationalRAGService, ConversationContext } from '@application/services/conversational-rag.service';
import { dbConfig } from '@infrastructure/config/database';
import { aiConfig } from '@infrastructure/config/ai';

async function testConversationalRAG() {
  console.log('='.repeat(70));
  console.log('Conversational RAG Service Test');
  console.log('='.repeat(70));
  console.log();

  const pool = new Pool({
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database,
    user: dbConfig.username,
    password: dbConfig.password
  });

  try {
    // Initialize services
    console.log('Initializing AI services...');
    const providerInfo = AIProviderFactory.getProviderInfo();
    console.log(`Using ${providerInfo.provider} provider (LLM: ${providerInfo.llmModel}, Embeddings: ${providerInfo.embeddingModel})`);
    console.log();

    const db = DatabaseConnection.getInstance();
    const vehicleRepository = new VehicleRepository(db);
    const embeddingService = AIProviderFactory.createEmbeddingService();
    const vectorStore = new PgVectorStore(pool, aiConfig.vectorStore.tableName);
    const llmProvider = AIProviderFactory.createLLMProvider();

    const semanticSearch = new SemanticVehicleSearchService(
      embeddingService,
      vectorStore,
      llmProvider,
      vehicleRepository
    );

    const conversationalRAG = new ConversationalRAGService(semanticSearch);

    console.log('Services initialized successfully!\n');

    // Test conversation scenarios
    await testBasicConversation(conversationalRAG);
    await testFollowUpQuestions(conversationalRAG);
    await testBudgetRefinement(conversationalRAG);
    await testBilingualConversation(conversationalRAG);

    console.log('\n' + '='.repeat(70));
    console.log('All conversational RAG tests completed successfully!');
    console.log('='.repeat(70));

  } catch (error) {
    console.error('ERROR:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

async function testBasicConversation(service: ConversationalRAGService) {
  console.log('TEST 1: Basic Conversation Flow');
  console.log('-'.repeat(70));

  let context: ConversationContext = { messages: [] };

  // Turn 1: Initial query
  console.log('\nUser: "Busco un SUV familiar"');
  let response = await service.chat('Busco un SUV familiar', context);
  context = response.context;

  console.log(`\nAssistant: ${response.message}`);
  if (response.vehicles) {
    console.log(`\nVehicles found: ${response.vehicles.length}`);
    response.vehicles.slice(0, 2).forEach(v => {
      console.log(`  - ${v.year} ${v.make} ${v.model} - $${v.price.toLocaleString('es-MX')} MXN`);
    });
  }
  if (response.suggestedFollowUps) {
    console.log('\nSuggested follow-ups:');
    response.suggestedFollowUps.forEach(s => console.log(`  - ${s}`));
  }

  console.log('\n' + '='.repeat(70) + '\n');
}

async function testFollowUpQuestions(service: ConversationalRAGService) {
  console.log('TEST 2: Multi-Turn Conversation with Follow-ups');
  console.log('-'.repeat(70));

  let context: ConversationContext = { messages: [] };

  // Turn 1
  console.log('\nUser: "I need a reliable car for commuting"');
  let response = await service.chat('I need a reliable car for commuting', context);
  context = response.context;
  console.log(`\nAssistant: ${response.message.substring(0, 200)}...`);

  // Turn 2: Follow-up question
  console.log('\n\nUser: "What about fuel efficiency?"');
  response = await service.chat('What about fuel efficiency?', context);
  context = response.context;
  console.log(`\nAssistant: ${response.message.substring(0, 200)}...`);

  // Turn 3: Specific question about first option
  console.log('\n\nUser: "Tell me more about the first option"');
  response = await service.chat('Tell me more about the first option', context);
  context = response.context;
  console.log(`\nAssistant: ${response.message.substring(0, 200)}...`);

  console.log(`\n\nConversation turns: ${context.messages.length}`);
  console.log('\n' + '='.repeat(70) + '\n');
}

async function testBudgetRefinement(service: ConversationalRAGService) {
  console.log('TEST 3: Budget Refinement Conversation');
  console.log('-'.repeat(70));

  let context: ConversationContext = { messages: [] };

  // Turn 1: Initial query
  console.log('\nUser: "Quiero un carro económico"');
  let response = await service.chat('Quiero un carro económico', context);
  context = response.context;
  console.log(`\nAssistant: ${response.message.substring(0, 150)}...`);

  // Turn 2: Specify budget
  console.log('\n\nUser: "Mi presupuesto es entre $150,000 y $200,000 pesos"');
  response = await service.chat('Mi presupuesto es entre $150,000 y $200,000 pesos', context);
  context = response.context;
  console.log(`\nAssistant: ${response.message.substring(0, 150)}...`);

  if (response.vehicles) {
    console.log(`\nVehicles in budget: ${response.vehicles.length}`);
    const avgPrice = response.vehicles.reduce((sum, v) => sum + v.price, 0) / response.vehicles.length;
    console.log(`Average price: $${avgPrice.toLocaleString('es-MX')} MXN`);
  }

  // Check if preferences were extracted
  if (context.userPreferences?.budget) {
    console.log('\nExtracted budget preference:');
    console.log(`  Min: $${context.userPreferences.budget.min.toLocaleString('es-MX')}`);
    console.log(`  Max: $${context.userPreferences.budget.max.toLocaleString('es-MX')}`);
  }

  console.log('\n' + '='.repeat(70) + '\n');
}

async function testBilingualConversation(service: ConversationalRAGService) {
  console.log('TEST 4: Bilingual Conversation (Spanish/English)');
  console.log('-'.repeat(70));

  let context: ConversationContext = { messages: [] };

  // Turn 1: Spanish
  console.log('\nUser: "Necesito una pickup para trabajo"');
  let response = await service.chat('Necesito una pickup para trabajo', context);
  context = response.context;
  console.log(`\nAssistant: ${response.message.substring(0, 150)}...`);

  // Turn 2: English follow-up
  console.log('\n\nUser: "Does it have good cargo capacity?"');
  response = await service.chat('Does it have good cargo capacity?', context);
  context = response.context;
  console.log(`\nAssistant: ${response.message.substring(0, 150)}...`);

  // Turn 3: Mixed
  console.log('\n\nUser: "¿Y qué tal el maintenance cost?"');
  response = await service.chat('¿Y qué tal el maintenance cost?', context);
  context = response.context;
  console.log(`\nAssistant: ${response.message.substring(0, 150)}...`);

  console.log('\n\nDemonstrated bilingual capability across conversation');
  console.log('\n' + '='.repeat(70) + '\n');
}

// Run tests
testConversationalRAG()
  .then(() => {
    console.log('\nTest completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\nTest failed:', error);
    process.exit(1);
  });
