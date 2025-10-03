// End-to-end integration test for complete AI infrastructure
// Validates entire pipeline from API requests to database persistence

import 'dotenv/config';
import express from 'express';
import { Pool } from 'pg';
import { setupAIServer } from '@infrastructure/server/ai-server-setup';
import { sessionMiddleware } from '@interface-adapters/middleware/session.middleware';
import { DatabaseConnection } from '@infrastructure/database/connection';
import { ConversationRepository } from '@infrastructure/database/repositories/conversation.repository';
import { VehicleRepository } from '@infrastructure/database/repositories/vehicle.repository';
import { dbConfig } from '@infrastructure/config/database';

interface TestResult {
  name: string;
  status: 'PASSED' | 'FAILED';
  duration: number;
  error?: string;
}

interface HealthResponse {
  status: string;
  timestamp: string;
  services: {
    embeddingService: boolean;
    llmProvider: boolean;
  };
}

interface SearchResponse {
  vehicles: Array<{
    id: string;
    year: number;
    make: string;
    model: string;
  }>;
}

interface ChatResponse {
  message: string;
  conversationId: string;
  messageCount: number;
  vehicles?: Array<{
    id: string;
    year: number;
    make: string;
    model: string;
  }>;
}

interface ConversationResponse {
  id: string;
  sessionId: string;
  messageCount: number;
  status: string;
  completedAt?: string;
}

interface CustomerConversationsResponse {
  conversations: Array<{
    id: string;
    sessionId: string;
  }>;
}

async function runE2EIntegrationTest() {
  console.log('='.repeat(80));
  console.log('END-TO-END AI INFRASTRUCTURE INTEGRATION TEST');
  console.log('='.repeat(80));
  console.log('\nThis test validates the complete AI pipeline:');
  console.log('  1. Database connectivity and schema');
  console.log('  2. Ollama LLM and embedding services');
  console.log('  3. Vector store operations');
  console.log('  4. Semantic search functionality');
  console.log('  5. Conversational RAG pipeline');
  console.log('  6. REST API endpoints');
  console.log('  7. Session and conversation persistence');
  console.log('  8. End-to-end user journey');
  console.log('='.repeat(80));
  console.log();

  const results: TestResult[] = [];
  let server: any;

  try {
    // Setup test environment
    const { app, port } = await setupTestEnvironment();
    server = app.listen(port);

    // Run test suite
    results.push(await runTest('Database Connection', testDatabaseConnection));
    results.push(await runTest('Vehicle Data Availability', () => testVehicleData(port)));
    results.push(await runTest('Ollama Services Health', () => testOllamaHealth(port)));
    results.push(await runTest('Vector Store Operations', testVectorStore));
    results.push(await runTest('Semantic Search', () => testSemanticSearch(port)));
    results.push(await runTest('Conversational RAG', () => testConversationalRAG(port)));
    results.push(await runTest('Conversation Persistence', () => testConversationPersistence(port)));
    results.push(await runTest('Multi-Turn Conversation', () => testMultiTurnConversation(port)));
    results.push(await runTest('Session Management', () => testSessionManagement(port)));
    results.push(await runTest('Complete User Journey', () => testCompleteUserJourney(port)));

    // Print results
    printTestResults(results);

  } catch (error) {
    console.error('\n❌ CRITICAL ERROR:', error);
    throw error;
  } finally {
    if (server) {
      server.close();
    }
    await cleanup();
  }
}

async function setupTestEnvironment() {
  console.log('Setting up test environment...');

  const app = express();
  app.use(express.json());
  app.use(sessionMiddleware);

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

  const port = 3002;
  console.log(`Test server configured on port ${port}\n`);

  return { app, port };
}

async function runTest(
  name: string,
  testFn: () => Promise<void>
): Promise<TestResult> {
  const start = Date.now();
  process.stdout.write(`Running: ${name}... `);

  try {
    await testFn();
    const duration = Date.now() - start;
    console.log(`✓ PASSED (${duration}ms)`);
    return { name, status: 'PASSED', duration };
  } catch (error) {
    const duration = Date.now() - start;
    console.log(`✗ FAILED (${duration}ms)`);
    console.log(`  Error: ${error instanceof Error ? error.message : String(error)}`);
    return {
      name,
      status: 'FAILED',
      duration,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function testDatabaseConnection() {
  const db = DatabaseConnection.getInstance();
  const result = await db.query('SELECT 1 as test');

  if (result.rows[0].test !== 1) {
    throw new Error('Database query returned unexpected result');
  }
}

async function testVehicleData(port: number) {
  const db = DatabaseConnection.getInstance();
  const vehicleRepo = new VehicleRepository(db);

  const vehicles = await vehicleRepo.findFeaturedVehicles(5);

  if (vehicles.length === 0) {
    throw new Error('No vehicles found in database. Run seeding first: npm run seed');
  }
}

async function testOllamaHealth(port: number) {
  const response = await fetch(`http://localhost:${port}/api/ai/health`);
  const data = await response.json() as HealthResponse;

  if (!data.services?.embeddingService) {
    throw new Error('Embedding service not healthy');
  }

  if (!data.services?.llmProvider) {
    throw new Error('LLM provider not healthy');
  }
}

async function testVectorStore() {
  const pool = new Pool({
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database,
    user: dbConfig.username,
    password: dbConfig.password
  });

  try {
    // Verify pgvector extension
    const result = await pool.query(
      "SELECT COUNT(*) as count FROM vehicle_embeddings"
    );

    if (parseInt(result.rows[0].count) === 0) {
      throw new Error('No vehicle embeddings found. Run: npm run sync:vehicle-embeddings');
    }
  } finally {
    await pool.end();
  }
}

async function testSemanticSearch(port: number) {
  const response = await fetch(`http://localhost:${port}/api/ai/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: 'reliable family SUV',
      limit: 3
    })
  });

  if (!response.ok) {
    throw new Error(`Search failed with status ${response.status}`);
  }

  const data = await response.json() as SearchResponse;

  if (!data.vehicles || data.vehicles.length === 0) {
    throw new Error('Semantic search returned no results');
  }
}

async function testConversationalRAG(port: number) {
  const sessionId = `e2e-test-${Date.now()}`;

  const response = await fetch(`http://localhost:${port}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'I need an affordable car for commuting',
      sessionId
    })
  });

  if (!response.ok) {
    throw new Error(`Chat failed with status ${response.status}`);
  }

  const data = await response.json() as ChatResponse;

  if (!data.message || typeof data.message !== 'string') {
    throw new Error('Chat returned invalid response');
  }

  if (!data.conversationId) {
    throw new Error('No conversation ID returned');
  }
}

async function testConversationPersistence(port: number) {
  const sessionId = `persist-test-${Date.now()}`;

  // Send message
  await fetch(`http://localhost:${port}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Looking for a Honda',
      sessionId
    })
  });

  // Retrieve conversation
  const response = await fetch(
    `http://localhost:${port}/api/ai/conversations/session/${sessionId}`
  );

  if (!response.ok) {
    throw new Error('Failed to retrieve conversation');
  }

  const data = await response.json() as ConversationResponse;

  if (data.messageCount < 2) {
    throw new Error('Conversation not persisted correctly');
  }

  if (data.status !== 'active') {
    throw new Error('Conversation status incorrect');
  }
}

async function testMultiTurnConversation(port: number) {
  const sessionId = `multi-turn-${Date.now()}`;

  // Turn 1
  let response = await fetch(`http://localhost:${port}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Show me affordable sedans',
      sessionId
    })
  });

  let data = await response.json() as ChatResponse;
  const turn1Count = data.messageCount;

  // Turn 2
  response = await fetch(`http://localhost:${port}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'What about automatic transmission?',
      sessionId
    })
  });

  data = await response.json() as ChatResponse;
  const turn2Count = data.messageCount;

  if (turn2Count <= turn1Count) {
    throw new Error('Message count not increasing across turns');
  }

  // Turn 3
  response = await fetch(`http://localhost:${port}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Tell me more about the first one',
      sessionId
    })
  });

  if (!response.ok) {
    throw new Error('Failed on follow-up question');
  }
}

async function testSessionManagement(port: number) {
  const customerId = crypto.randomUUID();

  // Create multiple sessions for same customer
  await fetch(`http://localhost:${port}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Hello',
      sessionId: `session-1-${Date.now()}`,
      customerId
    })
  });

  await fetch(`http://localhost:${port}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Hi again',
      sessionId: `session-2-${Date.now()}`,
      customerId
    })
  });

  // Retrieve customer conversations
  const response = await fetch(
    `http://localhost:${port}/api/ai/conversations/customer/${customerId}`
  );

  const data = await response.json() as CustomerConversationsResponse;

  if (!data.conversations || data.conversations.length < 2) {
    throw new Error('Customer conversations not properly tracked');
  }
}

async function testCompleteUserJourney(port: number) {
  const sessionId = `journey-${Date.now()}`;

  // User starts conversation
  let response = await fetch(`http://localhost:${port}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Busco un SUV familiar con buen rendimiento de gasolina',
      sessionId
    })
  });

  let data = await response.json() as ChatResponse;
  if (!data.vehicles || data.vehicles.length === 0) {
    throw new Error('No vehicles recommended');
  }

  // User asks follow-up
  response = await fetch(`http://localhost:${port}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: '¿Cuál es el más económico?',
      sessionId
    })
  });

  if (!response.ok) {
    throw new Error('Follow-up failed');
  }

  // User asks about financing
  response = await fetch(`http://localhost:${port}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: '¿Qué opciones de financiamiento hay?',
      sessionId
    })
  });

  if (!response.ok) {
    throw new Error('Financing question failed');
  }

  // Complete conversation
  response = await fetch(
    `http://localhost:${port}/api/ai/conversations/session/${sessionId}/complete`,
    { method: 'POST' }
  );

  if (!response.ok) {
    throw new Error('Failed to complete conversation');
  }

  // Verify completion
  response = await fetch(
    `http://localhost:${port}/api/ai/conversations/session/${sessionId}`
  );

  const completedData = await response.json() as ConversationResponse;

  if (completedData.status !== 'completed') {
    throw new Error('Conversation not marked as completed');
  }

  if (!completedData.completedAt) {
    throw new Error('Completion timestamp not set');
  }
}

function printTestResults(results: TestResult[]) {
  console.log('\n' + '='.repeat(80));
  console.log('TEST RESULTS SUMMARY');
  console.log('='.repeat(80));

  const passed = results.filter(r => r.status === 'PASSED').length;
  const failed = results.filter(r => r.status === 'FAILED').length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  console.log(`\nTotal Tests: ${results.length}`);
  console.log(`Passed: ${passed} ✓`);
  console.log(`Failed: ${failed} ✗`);
  console.log(`Total Duration: ${totalDuration}ms`);

  if (failed > 0) {
    console.log('\nFailed Tests:');
    results.filter(r => r.status === 'FAILED').forEach(r => {
      console.log(`  ✗ ${r.name}`);
      if (r.error) {
        console.log(`    ${r.error}`);
      }
    });
  }

  console.log('\n' + '='.repeat(80));

  if (failed === 0) {
    console.log('✓ ALL TESTS PASSED');
    console.log('\nThe complete AI infrastructure is working correctly!');
    console.log('You can now:');
    console.log('  - Make API requests to /api/ai/chat');
    console.log('  - Use semantic search via /api/ai/search');
    console.log('  - Get recommendations via /api/ai/recommendations/:id');
    console.log('  - Manage conversations via session endpoints');
  } else {
    console.log('✗ SOME TESTS FAILED');
    console.log('\nPlease fix the failing tests before proceeding.');
  }

  console.log('='.repeat(80));
}

async function cleanup() {
  try {
    const db = DatabaseConnection.getInstance();
    await db.close();
  } catch (error) {
    // Ignore cleanup errors
  }
}

// Run the test suite
runE2EIntegrationTest()
  .then(() => {
    console.log('\n✓ End-to-end integration test completed\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n✗ End-to-end integration test failed:', error);
    process.exit(1);
  });
