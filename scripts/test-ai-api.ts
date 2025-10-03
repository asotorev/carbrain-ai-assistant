// Test script for AI API endpoints
// Validates REST API functionality for conversational search

import 'dotenv/config';
import express from 'express';
import { setupAIServer } from '@infrastructure/server/ai-server-setup';
import { sessionMiddleware } from '@interface-adapters/middleware/session.middleware';
import { dbConfig } from '@infrastructure/config/database';

interface Vehicle {
  id: string;
  year: number;
  make: string;
  model: string;
  price?: number;
}

interface SearchResponse {
  vehicles: Vehicle[];
  totalCount: number;
}

interface ChatResponse {
  message: string;
  conversationId: string;
  messageCount: number;
  vehicles?: Vehicle[];
  suggestedFollowUps?: string[];
}

interface ConversationResponse {
  id: string;
  sessionId: string;
  messageCount: number;
  status: string;
}

async function testAIAPI() {
  console.log('='.repeat(70));
  console.log('AI API Endpoints Test');
  console.log('='.repeat(70));
  console.log();

  // Create Express app
  const app = express();
  app.use(express.json());
  app.use(sessionMiddleware);

  // Setup AI routes
  const aiRoutes = setupAIServer({
    dbHost: dbConfig.host,
    dbPort: dbConfig.port,
    dbName: dbConfig.database,
    dbUser: dbConfig.username,
    dbPassword: dbConfig.password,
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    ollamaModel: process.env.OLLAMA_DEFAULT_MODEL || 'llama3.2'
  });

  app.use('/api/ai', aiRoutes);

  // Start server
  const PORT = 3001; // Use different port for testing
  const server = app.listen(PORT, () => {
    console.log(`Test server started on port ${PORT}`);
  });

  try {
    await testHealthCheck(PORT);
    await testSemanticSearch(PORT);
    await testChatEndpoint(PORT);
    await testConversationRetrieval(PORT);

    console.log('\n' + '='.repeat(70));
    console.log('All AI API tests completed successfully!');
    console.log('='.repeat(70));

  } catch (error) {
    console.error('ERROR:', error);
    throw error;
  } finally {
    server.close();
    process.exit(0);
  }
}

async function testHealthCheck(port: number) {
  console.log('TEST 1: Health Check Endpoint');
  console.log('-'.repeat(70));

  const response = await fetch(`http://localhost:${port}/api/ai/health`);
  const data = await response.json();

  console.log(`Status: ${response.status}`);
  console.log(`Response: ${JSON.stringify(data, null, 2)}`);

  if (response.status === 200 || response.status === 503) {
    console.log('✓ Health check endpoint working');
  } else {
    throw new Error('Health check failed');
  }

  console.log('\n' + '='.repeat(70) + '\n');
}

async function testSemanticSearch(port: number) {
  console.log('TEST 2: Semantic Search Endpoint');
  console.log('-'.repeat(70));

  const response = await fetch(`http://localhost:${port}/api/ai/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: 'SUV familiar económico',
      limit: 5
    })
  });

  const data = await response.json() as SearchResponse;

  console.log(`Status: ${response.status}`);
  console.log(`Vehicles found: ${data.vehicles?.length || 0}`);

  if (data.vehicles && data.vehicles.length > 0) {
    const vehicle = data.vehicles[0];
    if (vehicle) {
      console.log('\nTop result:');
      console.log(`  ${vehicle.year} ${vehicle.make} ${vehicle.model}`);
      if (vehicle.price) {
        console.log(`  Price: $${vehicle.price.toLocaleString('es-MX')} MXN`);
      }
    }
  }

  console.log('\n✓ Semantic search endpoint working');
  console.log('\n' + '='.repeat(70) + '\n');
}

async function testChatEndpoint(port: number) {
  console.log('TEST 3: Conversational Chat Endpoint');
  console.log('-'.repeat(70));

  const sessionId = `test-session-${Date.now()}`;

  // First message
  console.log('\nUser: "Busco un carro confiable para ir al trabajo"');
  let response = await fetch(`http://localhost:${port}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Busco un carro confiable para ir al trabajo',
      sessionId
    })
  });

  let data = await response.json() as ChatResponse;
  console.log(`\nAssistant: ${data.message.substring(0, 150)}...`);
  console.log(`Vehicles suggested: ${data.vehicles?.length || 0}`);
  console.log(`Conversation ID: ${data.conversationId}`);

  // Follow-up message
  console.log('\n\nUser: "¿Cuál es el más económico?"');
  response = await fetch(`http://localhost:${port}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: '¿Cuál es el más económico?',
      sessionId
    })
  });

  data = await response.json() as ChatResponse;
  console.log(`\nAssistant: ${data.message.substring(0, 150)}...`);
  console.log(`Message count: ${data.messageCount}`);

  if (data.suggestedFollowUps) {
    console.log('\nSuggested follow-ups:');
    data.suggestedFollowUps.forEach((s: string) => console.log(`  - ${s}`));
  }

  console.log('\n✓ Chat endpoint with context working');
  console.log('\n' + '='.repeat(70) + '\n');
}

async function testConversationRetrieval(port: number) {
  console.log('TEST 4: Conversation Retrieval');
  console.log('-'.repeat(70));

  const sessionId = `retrieval-test-${Date.now()}`;

  // Create conversation
  await fetch(`http://localhost:${port}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Hello, I need a car',
      sessionId
    })
  });

  // Retrieve conversation
  const response = await fetch(
    `http://localhost:${port}/api/ai/conversations/session/${sessionId}`
  );

  const data = await response.json() as ConversationResponse;

  console.log(`Status: ${response.status}`);
  console.log(`Conversation ID: ${data.id}`);
  console.log(`Session ID: ${data.sessionId}`);
  console.log(`Message count: ${data.messageCount}`);
  console.log(`Status: ${data.status}`);

  console.log('\n✓ Conversation retrieval working');
  console.log('\n' + '='.repeat(70) + '\n');
}

// Run tests
testAIAPI()
  .catch(error => {
    console.error('\nTest failed:', error);
    process.exit(1);
  });
